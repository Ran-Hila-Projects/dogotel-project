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
ses = boto3.client('ses')

# Environment variables
BOOKINGS_TABLE = os.environ['DYNAMODB_TABLE_BOOKINGS']
ROOMS_TABLE = os.environ['DYNAMODB_TABLE_ROOMS']

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
            return handle_get_user_bookings(event)
        elif path.startswith('/bookings/') and path.count('/') == 2 and http_method == 'GET':
            booking_id = path.split('/')[-1]
            return handle_get_booking(booking_id, event)
        elif path.startswith('/bookings/') and path.count('/') == 2 and http_method == 'DELETE':
            booking_id = path.split('/')[-1]
            return handle_cancel_booking(booking_id, event)
        elif path == '/admin/bookings' and http_method == 'GET':
            return handle_admin_get_all_bookings(event)
        elif path.startswith('/admin/bookings/') and http_method == 'PUT':
            booking_id = path.split('/')[-1]
            return handle_admin_update_booking(booking_id, event)
        else:
            return cors_error_response(404, 'Endpoint not found', origin)
            
    except Exception as e:
        print(f"Error in bookings handler: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_create_booking(event):
    """Handle creating a new booking"""
    try:
        # Get user info from JWT token
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_email = claims.get('email')
        user_name = claims.get('name', 'User')
        
        if not user_email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        body = json.loads(event['body'])
        required_fields = ['room_id', 'check_in', 'check_out', 'guest_count']
        
        for field in required_fields:
            if field not in body:
                return cors_response(400, {'error': f'{field} is required'}, origin)
        
        room_id = body['room_id']
        check_in = body['check_in']
        check_out = body['check_out']
        guest_count = int(body['guest_count'])
        
        # Validate dates
        try:
            check_in_date = datetime.fromisoformat(check_in.replace('Z', '+00:00'))
            check_out_date = datetime.fromisoformat(check_out.replace('Z', '+00:00'))
            
            if check_in_date >= check_out_date:
                return cors_error_response(400, 'Check-out must be after check-in', origin)
            
            if check_in_date < datetime.now():
                return cors_error_response(400, 'Check-in date cannot be in the past', origin)
                
        except ValueError:
            return cors_error_response(400, 'Invalid date format', origin)
        
        # Check if room exists and is available
        room_response = rooms_table.get_item(Key={'room_id': room_id})
        if 'Item' not in room_response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        room = room_response['Item']
        
        if not room.get('is_available', False):
            return cors_error_response(400, 'Room is not available', origin)
        
        if guest_count > room.get('capacity', 1):
            return cors_error_response(400, 'Guest count exceeds room capacity', origin)
        
        # Check availability for the dates
        if not is_room_available(room_id, check_in, check_out):
            return cors_error_response(400, 'Room is not available for selected dates', origin)
        
        # Calculate total cost
        nights = (check_out_date - check_in_date).days
        total_cost = Decimal(str(float(room['price_per_night']) * nights))
        
        # Create booking
        booking_id = str(uuid.uuid4())
        booking_data = {
            'booking_id': booking_id,
            'user_id': user_email,  # Using email as user_id for simplicity
            'room_id': room_id,
            'check_in': check_in,
            'check_out': check_out,
            'guest_count': guest_count,
            'total_cost': total_cost,
            'status': 'confirmed',
            'special_requests': body.get('special_requests', ''),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        bookings_table.put_item(Item=booking_data)
        
        # Send confirmation email (simplified for POC)
        try:
            send_booking_confirmation_email(user_email, user_name, booking_data, room)
        except Exception as e:
            print(f"Email sending failed: {str(e)}")
            # Don't fail the booking if email fails
        
        return cors_response(201, {
                'message': 'Booking created successfully',
                'booking': convert_decimals(booking_data, origin))
        }
        
    except Exception as e:
        print(f"Create booking error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_user_bookings(event):
    """Handle getting user's bookings"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_email = claims.get('email')
        
        if not user_email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        response = bookings_table.query(
            IndexName='UserBookingsIndex',
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': user_email}
        )
        
        bookings = [convert_decimals(booking) for booking in response['Items']]
        
        return cors_response(200, {
                'bookings': bookings,
                'count': len(bookings, origin))
        }
        
    except Exception as e:
        print(f"Get user bookings error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_booking(booking_id, event):
    """Handle getting a specific booking"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_email = claims.get('email')
        user_role = claims.get('custom:role', 'USER')
        
        if not user_email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        response = bookings_table.get_item(Key={'booking_id': booking_id})
        
        if 'Item' not in response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        booking = response['Item']
        
        # Check if user owns the booking or is admin
        if booking['user_id'] != user_email and user_role != 'ADMIN':
            return cors_error_response(403, 'Access denied', origin)
        
        return cors_response(200, convert_decimals(booking), origin)
        
    except Exception as e:
        print(f"Get booking error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_cancel_booking(booking_id, event):
    """Handle canceling a booking"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_email = claims.get('email')
        user_role = claims.get('custom:role', 'USER')
        
        if not user_email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        response = bookings_table.get_item(Key={'booking_id': booking_id})
        
        if 'Item' not in response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        booking = response['Item']
        
        # Check if user owns the booking or is admin
        if booking['user_id'] != user_email and user_role != 'ADMIN':
            return cors_error_response(403, 'Access denied', origin)
        
        # Check if booking can be cancelled
        if booking['status'] in ['cancelled', 'completed']:
            return cors_error_response(400, 'Booking cannot be cancelled', origin)
        
        # Update booking status
        bookings_table.update_item(
            Key={'booking_id': booking_id},
            UpdateExpression='SET #status = :status, updated_at = :updated_at',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'cancelled',
                ':updated_at': datetime.utcnow().isoformat()
            }
        )
        
        return cors_response(200, {'message': 'Booking cancelled successfully'}, origin)
        
    except Exception as e:
        print(f"Cancel booking error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_admin_get_all_bookings(event):
    """Handle admin getting all bookings"""
    try:
        if not is_admin(event):
            return cors_error_response(403, 'Admin access required', origin)
        
        response = bookings_table.scan()
        bookings = [convert_decimals(booking) for booking in response['Items']]
        
        return cors_response(200, {
                'bookings': bookings,
                'count': len(bookings, origin))
        }
        
    except Exception as e:
        print(f"Admin get all bookings error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_admin_update_booking(booking_id, event):
    """Handle admin updating a booking"""
    try:
        if not is_admin(event):
            return cors_error_response(403, 'Admin access required', origin)
        
        body = json.loads(event['body'])
        
        # Check if booking exists
        response = bookings_table.get_item(Key={'booking_id': booking_id})
        if 'Item' not in response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        # Build update expression
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.utcnow().isoformat()}
        
        allowed_fields = ['status', 'special_requests', 'guest_count']
        for field in allowed_fields:
            if field in body:
                update_expression += f", {field} = :{field}"
                expression_values[f':{field}'] = body[field]
        
        bookings_table.update_item(
            Key={'booking_id': booking_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        # Get updated booking
        updated_response = bookings_table.get_item(Key={'booking_id': booking_id})
        updated_booking = convert_decimals(updated_response['Item'])
        
        return cors_response(200, {
                'message': 'Booking updated successfully',
                'booking': updated_booking
            }, origin)
        
    except Exception as e:
        print(f"Admin update booking error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

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

def send_booking_confirmation_email(user_email, user_name, booking, room):
    """Send booking confirmation email using SES"""
    try:
        subject = f"Booking Confirmation - Dogotel #{booking['booking_id'][:8]}"
        
        # Create email body
        body_text = f"""
Dear {user_name},

Your booking has been confirmed!

Booking Details:
- Booking ID: {booking['booking_id']}
- Room: {room.get('name', 'Room')}
- Check-in: {booking['check_in']}
- Check-out: {booking['check_out']}
- Guests: {booking['guest_count']}
- Total Cost: ${float(booking['total_cost']):.2f}

Thank you for choosing Dogotel!

Best regards,
The Dogotel Team
        """
        
        body_html = f"""
<html>
<head></head>
<body>
    <h2>Booking Confirmation</h2>
    <p>Dear {user_name},</p>
    <p>Your booking has been confirmed!</p>
    
    <h3>Booking Details:</h3>
    <ul>
        <li><strong>Booking ID:</strong> {booking['booking_id']}</li>
        <li><strong>Room:</strong> {room.get('name', 'Room')}</li>
        <li><strong>Check-in:</strong> {booking['check_in']}</li>
        <li><strong>Check-out:</strong> {booking['check_out']}</li>
        <li><strong>Guests:</strong> {booking['guest_count']}</li>
        <li><strong>Total Cost:</strong> ${float(booking['total_cost']):.2f}</li>
    </ul>
    
    <p>Thank you for choosing Dogotel!</p>
    <p>Best regards,<br>The Dogotel Team</p>
</body>
</html>
        """
        
        # Note: In a real implementation, you would need to verify the sender email with SES
        # For POC purposes, this is commented out to avoid SES setup issues
        # ses.send_email(
        #     Source='noreply@dogotel.com',  # This needs to be verified in SES
        #     Destination={'ToAddresses': [user_email]},
        #     Message={
        #         'Subject': {'Data': subject},
        #         'Body': {
        #             'Text': {'Data': body_text},
        #             'Html': {'Data': body_html}
        #         }
        #     }
        # )
        
        print(f"Email would be sent to {user_email}: {subject}")
        
    except Exception as e:
        print(f"Email error: {str(e)}")
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
