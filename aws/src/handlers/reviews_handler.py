import json
import boto3
import os
from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event
import uuid
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
REVIEWS_TABLE = os.environ['DYNAMODB_TABLE_REVIEWS']
BOOKINGS_TABLE = os.environ['DYNAMODB_TABLE_BOOKINGS']

reviews_table = dynamodb.Table(REVIEWS_TABLE)
bookings_table = dynamodb.Table(BOOKINGS_TABLE)

def lambda_handler(event, context):
    """Main Lambda handler"""
    try:
        http_method = event['httpMethod']
        path = event['path']
        origin = extract_origin_from_event(event)
        
        print(f"Processing {http_method} {path} from origin: {origin}")
        
        # Handle preflight OPTIONS requests
        if http_method == 'OPTIONS':
            return handle_preflight_request(event, origin=origin)
        
        print(f"Processing {http_method} {path}")
        
        if path.startswith('/rooms/') and path.endswith('/reviews') and http_method == 'GET':
            # /rooms/{room_id}/reviews
            room_id = path.split('/')[-2]
            return handle_get_room_reviews(room_id, event)
        elif path.startswith('/rooms/') and path.endswith('/reviews') and http_method == 'POST':
            # /rooms/{room_id}/reviews
            room_id = path.split('/')[-2]
            return handle_create_review_for_room(room_id, event)
        elif path == '/reviews' and http_method == 'POST':
            return handle_create_review(event)
        elif path.startswith('/reviews/') and path.count('/') == 2 and http_method == 'PUT':
            review_id = path.split('/')[-1]
            return handle_update_review(review_id, event)
        elif path.startswith('/reviews/') and path.count('/') == 2 and http_method == 'DELETE':
            review_id = path.split('/')[-1]
            return handle_delete_review(review_id, event)
        elif path == '/admin/reviews' and http_method == 'GET':
            return handle_admin_get_all_reviews(event)
        elif path.startswith('/admin/reviews/') and path.endswith('/moderate') and http_method == 'PUT':
            review_id = path.split('/')[-2]
            return handle_admin_moderate_review(review_id, event)
        else:
            return cors_error_response(404, 'Endpoint not found', origin)
            
    except Exception as e:
        print(f"Error in reviews handler: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_room_reviews(room_id, event):
    """Handle getting reviews for a specific room"""
    try:
        response = reviews_table.query(
            IndexName='RoomReviewsIndex',
            KeyConditionExpression='room_id = :room_id',
            FilterExpression='#status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':room_id': room_id,
                ':status': 'approved'
            }
        )
        
        reviews = [convert_decimals(review) for review in response['Items']]
        
        # Calculate average rating
        if reviews:
            total_rating = sum(review['rating'] for review in reviews)
            average_rating = total_rating / len(reviews)
        else:
            average_rating = 0
        
        return cors_response(200, {
                'reviews': reviews,
                'count': len(reviews),
                'average_rating': round(average_rating, 2)
            }, origin)
        
    except Exception as e:
        print(f"Get room reviews error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_create_review(event):
    """Handle creating a new review"""
    try:
        # Get user info from JWT token
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_email = claims.get('email')
        user_name = claims.get('name', 'User')
        
        if not user_email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        body = json.loads(event['body'])
        required_fields = ['room_id', 'booking_id', 'rating', 'comment']
        
        for field in required_fields:
            if field not in body:
                return cors_response(400, {'error': f'{field} is required'}, origin)
        
        room_id = body['room_id']
        booking_id = body['booking_id']
        rating = int(body['rating'])
        comment = body['comment']
        
        # Validate rating
        if rating < 1 or rating > 5:
            return cors_error_response(400, 'Rating must be between 1 and 5', origin)
        
        # Check if booking exists and belongs to user
        booking_response = bookings_table.get_item(Key={'booking_id': booking_id})
        if 'Item' not in booking_response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        booking = booking_response['Item']
        
        if booking['user_id'] != user_email:
            return cors_error_response(403, 'Can only review your own bookings', origin)
        
        if booking['room_id'] != room_id:
            return cors_error_response(400, 'Room ID does not match booking', origin)
        
        # Check if booking is completed or checked out
        if booking['status'] not in ['completed', 'checked_out']:
            return cors_error_response(400, 'Can only review completed stays', origin)
        
        # Check if user already reviewed this booking
        existing_reviews = reviews_table.scan(
            FilterExpression='booking_id = :booking_id AND user_id = :user_id',
            ExpressionAttributeValues={
                ':booking_id': booking_id,
                ':user_id': user_email
            }
        )
        
        if existing_reviews['Items']:
            return cors_error_response(400, 'You have already reviewed this booking', origin)
        
        # Create review
        review_id = str(uuid.uuid4())
        review_data = {
            'review_id': review_id,
            'room_id': room_id,
            'booking_id': booking_id,
            'user_id': user_email,
            'user_name': user_name,
            'rating': rating,
            'comment': comment,
            'status': 'pending',  # Reviews need moderation in a real system
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        reviews_table.put_item(Item=review_data)
        
        return cors_response(201, {
                'message': 'Review created successfully',
                'review': convert_decimals(review_data)
            }, origin)
        
    except Exception as e:
        print(f"Create review error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_create_review_for_room(room_id, event):
    """Handle creating a review for a specific room (from frontend)"""
    try:
        origin = extract_origin_from_event(event)
        
        # Get user info from JWT token
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_email = claims.get('email')
        user_name = claims.get('name', 'User')
        
        if not user_email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        body = json.loads(event['body'])
        
        # Support frontend format (stars, review) and backend format (rating, comment)
        rating = body.get('stars') or body.get('rating')
        comment = body.get('review') or body.get('comment')
        
        # Validate required fields
        if not rating:
            return cors_error_response(400, 'stars/rating is required', origin)
        if not comment:
            return cors_error_response(400, 'review/comment is required', origin)
        
        rating = int(rating)
        
        # Validate rating
        if rating < 1 or rating > 5:
            return cors_error_response(400, 'Rating must be between 1 and 5', origin)
        
        # Check if user has a completed booking for this room
        booking_response = bookings_table.query(
            IndexName='UserBookingsIndex',
            KeyConditionExpression='user_id = :user_id',
            FilterExpression='room_id = :room_id AND #status IN (:completed, :checked_out)',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':user_id': user_email,
                ':room_id': room_id,
                ':completed': 'completed',
                ':checked_out': 'checked_out'
            }
        )
        
        if not booking_response['Items']:
            return cors_error_response(403, 'You must have a completed booking for this room to leave a review', origin)
        
        # Use the most recent completed booking
        completed_booking = sorted(booking_response['Items'], key=lambda x: x['created_at'], reverse=True)[0]
        booking_id = completed_booking['booking_id']
        
        # Check if user already reviewed this room
        existing_reviews = reviews_table.scan(
            FilterExpression='room_id = :room_id AND user_id = :user_id',
            ExpressionAttributeValues={
                ':room_id': room_id,
                ':user_id': user_email
            }
        )
        
        if existing_reviews['Items']:
            return cors_error_response(400, 'You have already reviewed this room', origin)
        
        # Create review
        review_id = str(uuid.uuid4())
        review_data = {
            'review_id': review_id,
            'room_id': room_id,
            'booking_id': booking_id,
            'user_id': user_email,
            'user_name': user_name,
            'rating': rating,
            'comment': comment,
            'status': 'approved',  # Auto-approve for POC
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        reviews_table.put_item(Item=review_data)
        
        return cors_response(201, {
                'success': True,
                'reviewId': review_id,
                'message': 'Review created successfully',
                'review': convert_decimals(review_data)
            }, origin)
        
    except Exception as e:
        print(f"Create review for room error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_update_review(review_id, event):
    """Handle updating a review (user can only update their own)"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_email = claims.get('email')
        
        if not user_email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        body = json.loads(event['body'])
        
        # Check if review exists
        response = reviews_table.get_item(Key={'review_id': review_id})
        if 'Item' not in response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        review = response['Item']
        
        # Check if user owns the review
        if review['user_id'] != user_email:
            return cors_error_response(403, 'Can only update your own reviews', origin)
        
        # Build update expression
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.utcnow().isoformat()}
        
        if 'rating' in body:
            rating = int(body['rating'])
            if rating < 1 or rating > 5:
                return cors_error_response(400, 'Rating must be between 1 and 5', origin)
            update_expression += ", rating = :rating"
            expression_values[':rating'] = rating
        
        if 'comment' in body:
            update_expression += ", comment = :comment"
            expression_values[':comment'] = body['comment']
        
        # Reset status to pending if content changed
        if 'rating' in body or 'comment' in body:
            update_expression += ", #status = :status"
            expression_values[':status'] = 'pending'
        
        reviews_table.update_item(
            Key={'review_id': review_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames={'#status': 'status'} if 'status' in expression_values else {},
            ExpressionAttributeValues=expression_values
        )
        
        # Get updated review
        updated_response = reviews_table.get_item(Key={'review_id': review_id})
        updated_review = convert_decimals(updated_response['Item'])
        
        return cors_response(200, {
                'message': 'Review updated successfully',
                'review': updated_review
            }, origin)
        
    except Exception as e:
        print(f"Update review error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_delete_review(review_id, event):
    """Handle deleting a review"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_email = claims.get('email')
        user_role = claims.get('custom:role', 'USER')
        
        if not user_email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        # Check if review exists
        response = reviews_table.get_item(Key={'review_id': review_id})
        if 'Item' not in response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        review = response['Item']
        
        # Check if user owns the review or is admin
        if review['user_id'] != user_email and user_role != 'ADMIN':
            return cors_error_response(403, 'Access denied', origin)
        
        # Delete review
        reviews_table.delete_item(Key={'review_id': review_id})
        
        return cors_response(200, {'message': 'Review deleted successfully'}, origin)
        
    except Exception as e:
        print(f"Delete review error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_admin_get_all_reviews(event):
    """Handle admin getting all reviews"""
    try:
        if not is_admin(event):
            return cors_error_response(403, 'Admin access required', origin)
        
        query_params = event.get('queryStringParameters') or {}
        status_filter = query_params.get('status')
        
        if status_filter:
            response = reviews_table.scan(
                FilterExpression='#status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': status_filter}
            )
        else:
            response = reviews_table.scan()
        
        reviews = [convert_decimals(review) for review in response['Items']]
        
        return cors_response(200, {
                'reviews': reviews,
                'count': len(reviews)
            }, origin)
        
    except Exception as e:
        print(f"Admin get all reviews error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_admin_moderate_review(review_id, event):
    """Handle admin moderating a review"""
    try:
        if not is_admin(event):
            return cors_error_response(403, 'Admin access required', origin)
        
        body = json.loads(event['body'])
        action = body.get('action')  # 'approve', 'reject', 'pending'
        
        if action not in ['approve', 'reject', 'pending']:
            return cors_error_response(400, 'Invalid action. Must be approve, reject, or pending', origin)
        
        # Check if review exists
        response = reviews_table.get_item(Key={'review_id': review_id})
        if 'Item' not in response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        # Map action to status
        status_map = {
            'approve': 'approved',
            'reject': 'rejected',
            'pending': 'pending'
        }
        
        new_status = status_map[action]
        
        # Update review status
        reviews_table.update_item(
            Key={'review_id': review_id},
            UpdateExpression='SET #status = :status, updated_at = :updated_at, moderated_by = :moderated_by',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': new_status,
                ':updated_at': datetime.utcnow().isoformat(),
                ':moderated_by': event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('email', 'admin')
            }
        )
        
        # Get updated review
        updated_response = reviews_table.get_item(Key={'review_id': review_id})
        updated_review = convert_decimals(updated_response['Item'])
        
        return cors_response(200, {
                'message': f'Review {action}d successfully',
                'review': updated_review
            }, origin)
        
    except Exception as e:
        print(f"Admin moderate review error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def is_admin(event):
    """Check if the user has admin role"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        role = claims.get('custom:role', 'USER')
        return role == 'ADMIN'
    except:
        return False

def convert_decimals(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    else:
        return obj
