import json
import boto3
import os
from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event
from datetime import datetime, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
ROOMS_TABLE = os.environ['DYNAMODB_TABLE_ROOMS']
BOOKINGS_TABLE = os.environ['DYNAMODB_TABLE_BOOKINGS']
REVIEWS_TABLE = os.environ['DYNAMODB_TABLE_REVIEWS']
USERS_TABLE = os.environ['DYNAMODB_TABLE_USERS']

rooms_table = dynamodb.Table(ROOMS_TABLE)
bookings_table = dynamodb.Table(BOOKINGS_TABLE)
reviews_table = dynamodb.Table(REVIEWS_TABLE)
users_table = dynamodb.Table(USERS_TABLE)

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
        
        if path == '/admin/dashboard' and http_method == 'GET':
            return handle_get_dashboard(event)
        else:
            return cors_error_response(404, 'Endpoint not found', origin)
            
    except Exception as e:
        print(f"Error in admin dashboard handler: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_dashboard(event):
    """Handle getting admin dashboard data"""
    try:
        # Check if user is admin
        if not is_admin(event):
            return cors_error_response(403, 'Admin access required', origin)
        
        # Get dashboard data
        dashboard_data = {
            'overview': get_overview_stats(),
            'recent_bookings': get_recent_bookings(),
            'room_occupancy': get_room_occupancy(),
            'revenue_stats': get_revenue_stats(),
            'pending_reviews': get_pending_reviews(),
            'user_stats': get_user_stats()
        }
        
        return cors_response(200, convert_decimals(dashboard_data), origin)
        
    except Exception as e:
        print(f"Get dashboard error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def get_overview_stats():
    """Get basic overview statistics"""
    try:
        # Get total counts
        rooms_response = rooms_table.scan(Select='COUNT')
        total_rooms = rooms_response['Count']
        
        bookings_response = bookings_table.scan(Select='COUNT')
        total_bookings = bookings_response['Count']
        
        reviews_response = reviews_table.scan(Select='COUNT')
        total_reviews = reviews_response['Count']
        
        users_response = users_table.scan(Select='COUNT')
        total_users = users_response['Count']
        
        # Get active bookings count
        today = datetime.utcnow().isoformat()
        active_bookings_response = bookings_table.scan(
            FilterExpression='#status IN (:confirmed, :checked_in) AND check_out > :today',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':confirmed': 'confirmed',
                ':checked_in': 'checked_in',
                ':today': today
            },
            Select='COUNT'
        )
        active_bookings = active_bookings_response['Count']
        
        # Get available rooms count
        available_rooms_response = rooms_table.scan(
            FilterExpression='is_available = :available',
            ExpressionAttributeValues={':available': True},
            Select='COUNT'
        )
        available_rooms = available_rooms_response['Count']
        
        return {
            'total_rooms': total_rooms,
            'available_rooms': available_rooms,
            'total_bookings': total_bookings,
            'active_bookings': active_bookings,
            'total_reviews': total_reviews,
            'total_users': total_users
        }
        
    except Exception as e:
        print(f"Overview stats error: {str(e)}")
        return {
            'total_rooms': 0,
            'available_rooms': 0,
            'total_bookings': 0,
            'active_bookings': 0,
            'total_reviews': 0,
            'total_users': 0
        }

def get_recent_bookings():
    """Get recent bookings (last 10)"""
    try:
        response = bookings_table.scan()
        bookings = response['Items']
        
        # Sort by created_at descending and take last 10
        sorted_bookings = sorted(bookings, key=lambda x: x.get('created_at', ''), reverse=True)
        recent_bookings = sorted_bookings[:10]
        
        # Enrich with room names
        for booking in recent_bookings:
            try:
                room_response = rooms_table.get_item(Key={'room_id': booking['room_id']})
                if 'Item' in room_response:
                    booking['room_name'] = room_response['Item'].get('name', 'Unknown Room')
                else:
                    booking['room_name'] = 'Unknown Room'
            except:
                booking['room_name'] = 'Unknown Room'
        
        return recent_bookings
        
    except Exception as e:
        print(f"Recent bookings error: {str(e)}")
        return []

def get_room_occupancy():
    """Get room occupancy statistics"""
    try:
        # Get all rooms
        rooms_response = rooms_table.scan()
        rooms = rooms_response['Items']
        
        # Calculate occupancy for each room
        room_occupancy = []
        today = datetime.utcnow()
        
        for room in rooms:
            try:
                # Get active bookings for this room
                active_bookings_response = bookings_table.query(
                    IndexName='RoomBookingsIndex',
                    KeyConditionExpression='room_id = :room_id',
                    FilterExpression='#status IN (:confirmed, :checked_in)',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':room_id': room['room_id'],
                        ':confirmed': 'confirmed',
                        ':checked_in': 'checked_in'
                    }
                )
                
                active_bookings = active_bookings_response['Items']
                
                # Calculate occupancy rate (simplified)
                total_bookings_response = bookings_table.query(
                    IndexName='RoomBookingsIndex',
                    KeyConditionExpression='room_id = :room_id',
                    ExpressionAttributeValues={':room_id': room['room_id']}
                )
                
                total_bookings = len(total_bookings_response['Items'])
                occupancy_rate = min(len(active_bookings) * 10, 100)  # Simplified calculation
                
                room_occupancy.append({
                    'room_id': room['room_id'],
                    'room_name': room.get('name', 'Unknown Room'),
                    'active_bookings': len(active_bookings),
                    'total_bookings': total_bookings,
                    'occupancy_rate': occupancy_rate,
                    'is_available': room.get('is_available', False)
                })
                
            except Exception as e:
                print(f"Error calculating occupancy for room {room['room_id']}: {str(e)}")
                room_occupancy.append({
                    'room_id': room['room_id'],
                    'room_name': room.get('name', 'Unknown Room'),
                    'active_bookings': 0,
                    'total_bookings': 0,
                    'occupancy_rate': 0,
                    'is_available': room.get('is_available', False)
                })
        
        return room_occupancy
        
    except Exception as e:
        print(f"Room occupancy error: {str(e)}")
        return []

def get_revenue_stats():
    """Get revenue statistics"""
    try:
        # Get all completed bookings
        bookings_response = bookings_table.scan(
            FilterExpression='#status IN (:completed, :checked_out)',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':completed': 'completed',
                ':checked_out': 'checked_out'
            }
        )
        
        completed_bookings = bookings_response['Items']
        
        # Calculate total revenue
        total_revenue = Decimal('0')
        monthly_revenue = {}
        daily_revenue = {}
        
        today = datetime.utcnow()
        thirty_days_ago = today - timedelta(days=30)
        
        for booking in completed_bookings:
            try:
                total_cost = booking.get('total_cost', Decimal('0'))
                total_revenue += total_cost
                
                # Parse created_at for monthly and daily stats
                created_at = datetime.fromisoformat(booking.get('created_at', '').replace('Z', '+00:00'))
                month_key = created_at.strftime('%Y-%m')
                day_key = created_at.strftime('%Y-%m-%d')
                
                # Monthly revenue
                if month_key not in monthly_revenue:
                    monthly_revenue[month_key] = Decimal('0')
                monthly_revenue[month_key] += total_cost
                
                # Daily revenue (last 30 days)
                if created_at >= thirty_days_ago:
                    if day_key not in daily_revenue:
                        daily_revenue[day_key] = Decimal('0')
                    daily_revenue[day_key] += total_cost
                    
            except Exception as e:
                print(f"Error processing booking revenue: {str(e)}")
                continue
        
        # Calculate average booking value
        avg_booking_value = total_revenue / len(completed_bookings) if completed_bookings else Decimal('0')
        
        return {
            'total_revenue': total_revenue,
            'avg_booking_value': avg_booking_value,
            'completed_bookings': len(completed_bookings),
            'monthly_revenue': dict(monthly_revenue),
            'daily_revenue': dict(daily_revenue)
        }
        
    except Exception as e:
        print(f"Revenue stats error: {str(e)}")
        return {
            'total_revenue': Decimal('0'),
            'avg_booking_value': Decimal('0'),
            'completed_bookings': 0,
            'monthly_revenue': {},
            'daily_revenue': {}
        }

def get_pending_reviews():
    """Get pending reviews count and recent pending reviews"""
    try:
        # Get pending reviews
        pending_reviews_response = reviews_table.scan(
            FilterExpression='#status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': 'pending'}
        )
        
        pending_reviews = pending_reviews_response['Items']
        
        # Sort by created_at and get recent ones
        sorted_reviews = sorted(pending_reviews, key=lambda x: x.get('created_at', ''), reverse=True)
        recent_pending = sorted_reviews[:5]
        
        return {
            'pending_count': len(pending_reviews),
            'recent_pending': recent_pending
        }
        
    except Exception as e:
        print(f"Pending reviews error: {str(e)}")
        return {
            'pending_count': 0,
            'recent_pending': []
        }

def get_user_stats():
    """Get user statistics"""
    try:
        # Get all users
        users_response = users_table.scan()
        users = users_response['Items']
        
        # Count by role
        admin_count = 0
        user_count = 0
        
        for user in users:
            role = user.get('role', 'USER')
            if role == 'ADMIN':
                admin_count += 1
            else:
                user_count += 1
        
        # Get recent registrations (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_users = []
        
        for user in users:
            try:
                created_at = datetime.fromisoformat(user.get('created_at', '').replace('Z', '+00:00'))
                if created_at >= seven_days_ago:
                    recent_users.append(user)
            except:
                continue
        
        return {
            'total_users': len(users),
            'admin_count': admin_count,
            'user_count': user_count,
            'recent_registrations': len(recent_users)
        }
        
    except Exception as e:
        print(f"User stats error: {str(e)}")
        return {
            'total_users': 0,
            'admin_count': 0,
            'user_count': 0,
            'recent_registrations': 0
        }

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
