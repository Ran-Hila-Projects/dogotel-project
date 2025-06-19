import json
import boto3
import os
from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sqs = boto3.client('sqs')

# Environment variables
BOOKINGS_TABLE = os.environ['DYNAMODB_TABLE_BOOKINGS']
ROOMS_TABLE = os.environ['DYNAMODB_TABLE_ROOMS']
BOOKING_EVENTS_QUEUE_URL = os.environ.get('BOOKING_EVENTS_QUEUE_URL')

bookings_table = dynamodb.Table(BOOKINGS_TABLE)
rooms_table = dynamodb.Table(ROOMS_TABLE)

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
        
        if path == '/bookings' and http_method == 'POST':
            return handle_create_booking(event)
        elif path == '/bookings' and http_method == 'GET':
            # Check if there's a userId query parameter for endpoint 4
            query_params = event.get('queryStringParameters', {}) or {}
            if 'userId' in query_params:
                return handle_get_user_bookings_by_userId(event)
            else:
                # Endpoint 13 - get all bookings
                return handle_get_all_bookings(event)
# No other booking endpoints required from Ran_dev.txt
        else:
            return cors_error_response(404, 'Endpoint not found', origin)
            
    except Exception as e:
        print(f"Error in bookings handler: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_create_booking(event):
    """Handle creating a new booking - matches frontend cart format"""
    try:
        origin = extract_origin_from_event(event)
        
        body = json.loads(event['body'])
        
        # Frontend cart format:
        # {
        #   userEmail: "user@example.com",  // Added by frontend before submitting
        #   room: {
        #     startDate: "2024-01-01",
        #     endDate: "2024-01-03", 
        #     dogs: [{name: "Buddy", breed: "Golden", age: "3", notes: ""}],
        #     roomId: "1",
        #     roomTitle: "The Cozy Kennel",
        #     pricePerNight: 55
        #   },
        #   dining: {title: "Breakfast", price: 15},
        #   services: [{title: "Walking", price: 20}],
        #   totalPrice: 145  // Calculated by frontend
        # }
        
        # Extract data from cart format
        user_email = body.get('userEmail')
        room_data = body.get('room', {})
        dining_data = body.get('dining')
        services_data = body.get('services', [])
        total_price = body.get('totalPrice')
        
        # Extract room information
        room_id = room_data.get('roomId')
        room_title = room_data.get('roomTitle')
        start_date = room_data.get('startDate')
        end_date = room_data.get('endDate')
        price_per_night = room_data.get('pricePerNight')
        dogs = room_data.get('dogs', [])
        
        # Validate required fields
        if not user_email:
            return cors_error_response(400, 'userEmail is required', origin)
        if not room_id:
            return cors_error_response(400, 'room.roomId is required', origin)
        if not start_date:
            return cors_error_response(400, 'room.startDate is required', origin)
        if not end_date:
            return cors_error_response(400, 'room.endDate is required', origin)
        if not dogs:
            return cors_error_response(400, 'room.dogs is required', origin)
        
        # Validate dates
        try:
            check_in_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            check_out_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            if check_in_date >= check_out_date:
                return cors_error_response(400, 'Check-out must be after check-in', origin)
            
            if check_in_date < datetime.now():
                return cors_error_response(400, 'Check-in date cannot be in the past', origin)
                
        except ValueError:
            return cors_error_response(400, 'Invalid date format', origin)
        
        # Check if room exists and is available
        room_response = rooms_table.get_item(Key={'room_id': room_id})
        if 'Item' not in room_response:
            return cors_error_response(404, 'Room not found', origin)
        
        room = room_response['Item']
        
        if not room.get('is_available', True):
            return cors_error_response(400, 'Room is not available', origin)
        
        guest_count = len(dogs)
        if guest_count > room.get('dogsAmount', 1):
            return cors_error_response(400, 'Dog count exceeds room capacity', origin)
        
        # Check availability for the dates
        if not is_room_available(room_id, start_date, end_date):
            return cors_error_response(400, 'Room is not available for selected dates', origin)
        
        # Create booking with exact cart format
        booking_id = str(uuid.uuid4())
        booking_data = {
            'bookingId': booking_id,
            'userEmail': user_email,
            'room': room_data,
            'dining': dining_data,
            'services': services_data,
            'totalPrice': total_price,
            'status': 'confirmed',
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        bookings_table.put_item(Item=booking_data)
        
        # Send booking event to SQS for processing
        try:
            send_booking_event_to_sqs(booking_data, room, user_email, "User")
        except Exception as e:
            print(f"SQS message sending failed: {str(e)}")
            # Don't fail the booking if SQS fails
        
        return cors_response(201, {
                'success': True,
                'bookingId': booking_id,
                'message': 'Booking created successfully'
            }, origin)
        
    except Exception as e:
        print(f"Create booking error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_user_bookings_by_userId(event):
    """Handle GET /api/bookings?userId=... - Endpoint 4 from Ran_dev.txt"""
    try:
        origin = extract_origin_from_event(event)
        
        query_params = event.get('queryStringParameters', {}) or {}
        user_id = query_params.get('userId')
        
        if not user_id:
            return cors_error_response(400, 'userId parameter is required', origin)
        
        # Query bookings by userEmail
        response = bookings_table.query(
            IndexName='UserBookingsIndex',
            KeyConditionExpression='userEmail = :userEmail',
            ExpressionAttributeValues={':userEmail': user_id}
        )
        
        # Transform to exact format from Ran_dev.txt endpoint 4
        bookings = []
        for booking in response['Items']:
            room_data = booking.get('room', {})
            bookings.append({
                'bookingId': booking.get('bookingId'),
                'roomId': room_data.get('roomId'),
                'startDate': room_data.get('startDate'),
                'endDate': room_data.get('endDate'),
                'dogs': room_data.get('dogs', [])
            })
        
        return cors_response(200, bookings, origin)
        
    except Exception as e:
        print(f"Get user bookings error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_all_bookings(event):
    """Handle GET /api/bookings - Endpoint 13 from Ran_dev.txt"""
    try:
        origin = extract_origin_from_event(event)
        
        # Scan all bookings and sort by creation date
        response = bookings_table.scan()
        
        # Transform to exact format from Ran_dev.txt endpoint 13
        bookings = []
        for booking in response['Items']:
            room_data = booking.get('room', {})
            dogs_data = room_data.get('dogs', [])
            dog_names = [dog.get('name', '') for dog in dogs_data]
            
            bookings.append({
                'bookingId': booking.get('bookingId'),
                'user': booking.get('userEmail'),
                'room': room_data.get('roomTitle', ''),
                'dogs': dog_names,
                'startDate': room_data.get('startDate'),
                'endDate': room_data.get('endDate'),
                'createdAt': booking.get('createdAt')
            })
        
        # Sort by creation date (newest first)
        bookings.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return cors_response(200, bookings, origin)
        
    except Exception as e:
        print(f"Get all bookings error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))
        
    except Exception as e:
        print(f"Get user bookings error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

# Removed unused admin functions - only implementing endpoints from Ran_dev.txt

def is_room_available(room_id, check_in, check_out):
    """Check if room is available for given dates"""
    try:
        response = bookings_table.query(
            IndexName='RoomBookingsIndex',
            KeyConditionExpression='room_id = :room_id',
            FilterExpression='#status IN (:confirmed, :checked_in) AND (check_in < :check_out AND check_out > :check_in)',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':room_id': room_id,
                ':confirmed': 'confirmed',
                ':checked_in': 'checked_in',
                ':check_in': check_in,
                ':check_out': check_out
            }
        )
        
        return len(response['Items']) == 0
        
    except Exception as e:
        print(f"Availability check error: {str(e)}")
        return False

def send_booking_event_to_sqs(booking, room, user_email, user_name):
    """Send booking event to SQS for processing"""
    try:
        if not BOOKING_EVENTS_QUEUE_URL:
            print("SQS queue URL not configured")
            return
            
        # Create booking event message
        booking_event = {
            'event_type': 'booking_created',
            'booking': convert_decimals(booking),
            'room': convert_decimals(room),
            'user_email': user_email,
            'user_name': user_name,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Send message to SQS
        response = sqs.send_message(
            QueueUrl=BOOKING_EVENTS_QUEUE_URL,
            MessageBody=json.dumps(booking_event),
            MessageAttributes={
                'event_type': {
                    'StringValue': 'booking_created',
                    'DataType': 'String'
                }
            }
        )
        
        print(f"Booking event sent to SQS. MessageId: {response['MessageId']}")
        
    except Exception as e:
        print(f"Error sending booking event to SQS: {str(e)}")
        raise

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
