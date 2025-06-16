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

# Environment variables
ROOMS_TABLE = os.environ['DYNAMODB_TABLE_ROOMS']
BOOKINGS_TABLE = os.environ['DYNAMODB_TABLE_BOOKINGS']

rooms_table = dynamodb.Table(ROOMS_TABLE)
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
        
        if path == '/rooms' and http_method == 'GET':
            return handle_list_rooms(event)
        elif path.startswith('/rooms/') and path.count('/') == 2 and http_method == 'GET':
            room_id = path.split('/')[-1]
            return handle_get_room(room_id, event)
        elif path.startswith('/rooms/') and path.endswith('/unavailable-dates') and http_method == 'GET':
            room_id = path.split('/')[-2]
            return handle_get_unavailable_dates(room_id, event)
        elif path.startswith('/rooms/') and path.endswith('/unavailable-ranges') and http_method == 'GET':
            room_id = path.split('/')[-2]
            return handle_get_unavailable_ranges(room_id, event)
        elif path == '/admin/rooms' and http_method == 'POST':
            return handle_create_room(event)
        elif path.startswith('/admin/rooms/') and http_method == 'PUT':
            room_id = path.split('/')[-1]
            return handle_update_room(room_id, event)
        elif path.startswith('/admin/rooms/') and http_method == 'DELETE':
            room_id = path.split('/')[-1]
            return handle_delete_room(room_id, event)
        else:
            return cors_error_response(404, 'Endpoint not found', origin)
            
    except Exception as e:
        print(f"Error in rooms handler: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_list_rooms(event):
    """Handle listing all rooms with optional filters"""
    try:
        origin = extract_origin_from_event(event)
        query_params = event.get('queryStringParameters') or {}
        min_price = query_params.get('min_price')
        max_price = query_params.get('max_price')
        check_in = query_params.get('check_in')
        check_out = query_params.get('check_out')
        size = query_params.get('size')
        
        # Get all rooms
        response = rooms_table.scan()
        rooms = response['Items']
        
        # Apply filters
        filtered_rooms = []
        for room in rooms:
            # Price filter
            if min_price and room['price_per_night'] < Decimal(min_price):
                continue
            if max_price and room['price_per_night'] > Decimal(max_price):
                continue
            
            # Size filter
            if size and room.get('size', '').lower() != size.lower():
                continue
            
            # Availability filter
            if check_in and check_out:
                if not is_room_available(room['room_id'], check_in, check_out):
                    continue
            
            # Convert Decimal to float for JSON serialization and transform to frontend format
            room_copy = transform_room_for_frontend(convert_decimals(room))
            filtered_rooms.append(room_copy)
        
        return cors_response(200, {
                'rooms': filtered_rooms,
                'count': len(filtered_rooms)
            }, origin)
        
    except Exception as e:
        print(f"List rooms error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_room(room_id, event):
    """Handle getting a specific room"""
    try:
        origin = extract_origin_from_event(event)
        
        response = rooms_table.get_item(Key={'room_id': room_id})
        
        if 'Item' not in response:
            return cors_error_response(404, 'Room not found', origin)
        
        room = transform_room_for_frontend(convert_decimals(response['Item']))
        
        return cors_response(200, room, origin)
        
    except Exception as e:
        print(f"Get room error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_unavailable_dates(room_id, event):
    """Handle getting unavailable dates for a specific room"""
    try:
        origin = extract_origin_from_event(event)
        
        # Get all confirmed bookings for this room
        response = bookings_table.query(
            IndexName='RoomBookingsIndex',
            KeyConditionExpression='room_id = :room_id',
            FilterExpression='#status IN (:confirmed, :checked_in)',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':room_id': room_id,
                ':confirmed': 'confirmed',
                ':checked_in': 'checked_in'
            }
        )
        
        unavailable_dates = []
        for booking in response['Items']:
            # Generate all dates between check_in and check_out
            check_in = datetime.fromisoformat(booking['check_in'].replace('Z', '+00:00'))
            check_out = datetime.fromisoformat(booking['check_out'].replace('Z', '+00:00'))
            
            current_date = check_in.date()
            end_date = check_out.date()
            
            while current_date < end_date:  # Don't include checkout date
                unavailable_dates.append(current_date.isoformat())
                current_date += timedelta(days=1)
        
        return cors_response(200, {
            'roomId': room_id,
            'unavailableDates': sorted(list(set(unavailable_dates)))
        }, origin)
        
    except Exception as e:
        print(f"Get unavailable dates error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_unavailable_ranges(room_id, event):
    """Handle getting unavailable date ranges for a specific room"""
    try:
        origin = extract_origin_from_event(event)
        
        # Get all confirmed bookings for this room
        response = bookings_table.query(
            IndexName='RoomBookingsIndex',
            KeyConditionExpression='room_id = :room_id',
            FilterExpression='#status IN (:confirmed, :checked_in)',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':room_id': room_id,
                ':confirmed': 'confirmed',
                ':checked_in': 'checked_in'
            }
        )
        
        unavailable_ranges = []
        for booking in response['Items']:
            check_in = booking['check_in']
            check_out = booking['check_out']
            
            # Convert to date format for ranges
            check_in_date = datetime.fromisoformat(check_in.replace('Z', '+00:00')).date()
            check_out_date = datetime.fromisoformat(check_out.replace('Z', '+00:00')).date()
            
            # Adjust checkout date (booking ends day before checkout)
            actual_end_date = check_out_date - timedelta(days=1)
            
            unavailable_ranges.append({
                'start': check_in_date.isoformat(),
                'end': actual_end_date.isoformat()
            })
        
        return cors_response(200, {
            'roomId': room_id,
            'unavailableRanges': unavailable_ranges
        }, origin)
        
    except Exception as e:
        print(f"Get unavailable ranges error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_create_room(event):
    """Handle creating a new room (admin only)"""
    try:
        # Check if user is admin
        if not is_admin(event):
            return cors_error_response(403, 'Admin access required', origin)
        
        body = json.loads(event['body'])
        room_id = str(uuid.uuid4())
        
        required_fields = ['name', 'description', 'price_per_night', 'size', 'capacity']
        for field in required_fields:
            if field not in body:
                return cors_response(400, {'error': f'{field} is required'}, origin)
        
        room_data = {
            'room_id': room_id,
            'name': body['name'],
            'description': body['description'],
            'price_per_night': Decimal(str(body['price_per_night'])),
            'size': body['size'],
            'capacity': int(body['capacity']),
            'amenities': body.get('amenities', []),
            'images': body.get('images', []),
            'is_available': body.get('is_available', True),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        rooms_table.put_item(Item=room_data)
        
        return cors_response(201, {
                'message': 'Room created successfully',
                'room': convert_decimals(room_data)
            }, origin)
        
    except Exception as e:
        print(f"Create room error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_update_room(room_id, event):
    """Handle updating a room (admin only)"""
    try:
        # Check if user is admin
        if not is_admin(event):
            return cors_error_response(403, 'Admin access required', origin)
        
        body = json.loads(event['body'])
        
        # Check if room exists
        response = rooms_table.get_item(Key={'room_id': room_id})
        if 'Item' not in response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        # Build update expression
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.utcnow().isoformat()}
        
        for field in ['name', 'description', 'size', 'capacity', 'amenities', 'images', 'is_available']:
            if field in body:
                update_expression += f", {field} = :{field}"
                if field in ['capacity']:
                    expression_values[f':{field}'] = int(body[field])
                else:
                    expression_values[f':{field}'] = body[field]
        
        if 'price_per_night' in body:
            update_expression += ", price_per_night = :price_per_night"
            expression_values[':price_per_night'] = Decimal(str(body['price_per_night']))
        
        rooms_table.update_item(
            Key={'room_id': room_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        # Get updated room
        updated_response = rooms_table.get_item(Key={'room_id': room_id})
        updated_room = convert_decimals(updated_response['Item'])
        
        return cors_response(200, {
                'message': 'Room updated successfully',
                'room': updated_room
            }, origin)
        
    except Exception as e:
        print(f"Update room error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_delete_room(room_id, event):
    """Handle deleting a room (admin only)"""
    try:
        # Check if user is admin
        if not is_admin(event):
            return cors_error_response(403, 'Admin access required', origin)
        
        # Check if room exists
        response = rooms_table.get_item(Key={'room_id': room_id})
        if 'Item' not in response:
            return cors_error_response(404, 'Endpoint not found', origin)
        
        # Check for active bookings
        booking_response = bookings_table.query(
            IndexName='RoomBookingsIndex',
            KeyConditionExpression='room_id = :room_id',
            FilterExpression='#status IN (:confirmed, :checked_in)',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':room_id': room_id,
                ':confirmed': 'confirmed',
                ':checked_in': 'checked_in'
            }
        )
        
        if booking_response['Items']:
            return cors_error_response(400, 'Cannot delete room with active bookings', origin)
        
        # Delete room
        rooms_table.delete_item(Key={'room_id': room_id})
        
        return cors_response(200, {'message': 'Room deleted successfully'}, origin)
        
    except Exception as e:
        print(f"Delete room error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def is_room_available(room_id, check_in, check_out):
    """Check if room is available for given dates"""
    try:
        response = bookings_table.query(
            IndexName='RoomBookingsIndex',
            KeyConditionExpression='room_id = :room_id',
            FilterExpression='#status IN (:confirmed, :checked_in) AND (check_in <= :check_out AND check_out >= :check_in)',
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

def is_admin(event):
    """Check if the user has admin role"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        role = claims.get('custom:role', 'USER')
        return role == 'ADMIN'
    except:
        return False

def transform_room_for_frontend(room):
    """Transform room data to match frontend expectations from Ran_dev.txt"""
    return {
        'id': room.get('room_id'),
        'title': room.get('name'),
        'subtitle': room.get('subtitle', ''),
        'description': room.get('description'),
        'dogsAllowed': room.get('capacity', 1),
        'size': room.get('size'),
        'price': room.get('price_per_night'),
        'pricePerNight': room.get('price_per_night'),
        'imageUrl': room.get('images', ['/rooms-images/default.jpg'])[0] if room.get('images') else '/rooms-images/default.jpg',
        'features': room.get('amenities', []),
        'included': room.get('included', []),
        'reviews': room.get('reviews', []),
        'is_available': room.get('is_available', True)
    }

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
