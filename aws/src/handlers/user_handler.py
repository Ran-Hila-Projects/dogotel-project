import json
import boto3
import os
import base64
from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

# Environment variables
USERS_TABLE = os.environ['DYNAMODB_TABLE_USERS']
BOOKINGS_TABLE = os.environ['DYNAMODB_TABLE_BOOKINGS']
S3_BUCKET = os.environ.get('S3_BUCKET', 'dogotel-images')

users_table = dynamodb.Table(USERS_TABLE)
bookings_table = dynamodb.Table(BOOKINGS_TABLE)

def lambda_handler(event, context):
    """Main handler for user-related endpoints"""
    try:
        http_method = event['httpMethod']
        path = event['path']
        origin = extract_origin_from_event(event)
        
        print(f"Processing {http_method} {path} from origin: {origin}")
        
        # Handle preflight OPTIONS requests
        if http_method == 'OPTIONS':
            return handle_preflight_request(event, origin=origin)
        
        print(f"Processing {http_method} {path}")
        
        if path.startswith('/user/') and path.count('/') == 2 and http_method == 'GET':
            email = path.split('/')[-1]
            return handle_get_user_profile(email, event)
        elif path.startswith('/user/') and path.count('/') == 2 and http_method == 'PUT':
            email = path.split('/')[-1]
            return handle_update_user_profile(email, event)
        elif path.startswith('/bookings/') and path.count('/') == 2 and http_method == 'GET':
            email = path.split('/')[-1]
            return handle_get_booking_history(email, event)
        else:
            return cors_error_response(404, 'Endpoint not found', origin)
            
    except Exception as e:
        print(f"User handler error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_user_profile(email, event):
    """Handle GET /api/user/:email - exact format from Ran_dev.txt"""
    try:
        origin = extract_origin_from_event(event)
        
        # Get user from database
        response = users_table.get_item(Key={'email': email})
        
        if 'Item' not in response:
            return cors_response(200, {
                'success': False,
                'error': 'User not found'
            }, origin)
        
        user = response['Item']
        
        return cors_response(200, {
            'success': True,
            'user': {
                'username': user.get('name', user.get('username', '')),
                'birthdate': user.get('birthdate', ''),
                'email': user.get('email'),
                'photo': user.get('photo', 'https://via.placeholder.com/150')
            }
        }, origin)
        
    except Exception as e:
        print(f"Get user profile error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_update_user_profile(email, event):
    """Handle PUT /api/user/:email - update user profile"""
    try:
        origin = extract_origin_from_event(event)
        
        body = json.loads(event['body'])
        
        # Validate email
        if not email:
            return cors_error_response(400, 'Email is required', origin)
        
        # Update fields that are provided
        update_expression_parts = []
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        if 'username' in body:
            update_expression_parts.append('#username = :username')
            expression_attribute_values[':username'] = body['username']
            expression_attribute_names['#username'] = 'username'
        
        if 'birthdate' in body:
            update_expression_parts.append('birthdate = :birthdate')
            expression_attribute_values[':birthdate'] = body['birthdate']
        
        if 'photo' in body:
            # Handle base64 image upload to S3
            if body['photo'].startswith('data:image/'):
                photo_url = upload_image_to_s3(body['photo'], f"users/{email}")
            else:
                photo_url = body['photo']
            
            update_expression_parts.append('photo = :photo')
            expression_attribute_values[':photo'] = photo_url
        
        if not update_expression_parts:
            return cors_error_response(400, 'No valid fields to update', origin)
        
        # Add updatedAt timestamp
        update_expression_parts.append('updatedAt = :updatedAt')
        expression_attribute_values[':updatedAt'] = datetime.utcnow().isoformat()
        
        update_expression = 'SET ' + ', '.join(update_expression_parts)
        
        # Update user in database
        response = users_table.update_item(
            Key={'email': email},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ExpressionAttributeNames=expression_attribute_names if expression_attribute_names else None,
            ReturnValues='ALL_NEW'
        )
        
        updated_user = response['Attributes']
        
        return cors_response(200, {
            'success': True,
            'message': 'User profile updated successfully',
            'user': {
                'username': updated_user.get('username', ''),
                'birthdate': updated_user.get('birthdate', ''),
                'email': updated_user.get('email'),
                'photo': updated_user.get('photo', 'https://via.placeholder.com/150')
            }
        }, origin)
        
    except Exception as e:
        print(f"Update user profile error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_booking_history(email, event):
    """Handle GET /api/bookings/:email - exact format from Ran_dev.txt"""
    try:
        origin = extract_origin_from_event(event)
        
        # Get user's bookings from database
        response = bookings_table.query(
            IndexName='UserBookingsIndex',
            KeyConditionExpression='userEmail = :userEmail',
            ExpressionAttributeValues={
                ':userEmail': email
            }
        )
        
        if not response['Items']:
            return cors_response(200, {
                'success': False,
                'error': 'No bookings found for this user'
            }, origin)
        
        # Transform bookings to match Ran_dev.txt format
        history = []
        for booking in response['Items']:
            room_data = booking.get('room', {})
            dining_data = booking.get('dining', {})
            services_data = booking.get('services', [])
            
            dogs = room_data.get('dogs', [])
            dog_names = [dog.get('name', '') for dog in dogs]
            
            # Calculate date range
            start_date = room_data.get('startDate', '')
            end_date = room_data.get('endDate', '')
            dates = f"{start_date} to {end_date}" if start_date and end_date else 'Unknown dates'
            
            # Get dining selection
            dining_selection = dining_data.get('title', 'None') if dining_data else 'None'
            
            # Get services selection
            services_selection = ', '.join([s.get('title', '') for s in services_data]) if services_data else 'None'
            
            history.append({
                'bookingNumber': booking.get('bookingId', ''),
                'dates': dates,
                'dogs': dog_names,
                'diningSelection': dining_selection,
                'servicesSelection': services_selection,
                'totalPrice': booking.get('totalPrice', 0)
            })
        
        return cors_response(200, {
            'success': True,
            'history': history
        }, origin)
        
    except Exception as e:
        print(f"Get booking history error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def upload_image_to_s3(base64_image, key_prefix):
    """Upload base64 image to S3 and return the URL"""
    try:
        # Extract image data from base64 string
        header, encoded = base64_image.split(',', 1)
        image_data = base64.b64decode(encoded)
        
        # Determine file extension from header
        if 'jpeg' in header or 'jpg' in header:
            ext = 'jpg'
        elif 'png' in header:
            ext = 'png'
        else:
            ext = 'jpg'  # default
        
        # Create S3 key
        s3_key = f"{key_prefix}.{ext}"
        
        # Upload to S3
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=image_data,
            ContentType=f"image/{ext}",
            ACL='public-read'
        )
        
        # Return S3 URL
        return f"https://{S3_BUCKET}.s3.amazonaws.com/{s3_key}"
        
    except Exception as e:
        print(f"Error uploading image to S3: {str(e)}")
        return base64_image  # Return original if upload fails 