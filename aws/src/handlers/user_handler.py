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
    
    # Handle preflight requests
    if event['httpMethod'] == 'OPTIONS':
        return handle_preflight_request(event)
    
    try:
        origin = extract_origin_from_event(event)
        
        path = event['pathParameters']['proxy'] if event.get('pathParameters') and event['pathParameters'].get('proxy') else ''
        http_method = event['httpMethod']
        
        print(f"User handler - Path: {path}, Method: {http_method}")
        
        if path.startswith('user/') and http_method == 'GET':
            email = path.split('/')[-1]
            return handle_get_user_profile(email, event)
        elif path.startswith('bookings/') and http_method == 'GET':
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