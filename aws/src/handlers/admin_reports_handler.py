import json
import boto3
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Any
import os
from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Table references
rooms_table = dynamodb.Table(os.environ['ROOMS_TABLE'])
bookings_table = dynamodb.Table(os.environ['BOOKINGS_TABLE'])
reviews_table = dynamodb.Table(os.environ['REVIEWS_TABLE'])
users_table = dynamodb.Table(os.environ['USERS_TABLE'])

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(v) for v in obj]
    return obj

def cors_response(status_code: int, body: dict):
    """Return response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(decimal_to_float(body))
    }

def get_date_range(period: str) -> tuple:
    """Get start and end dates for the specified period"""
    end_date = datetime.now()
    
    if period == '7d':
        start_date = end_date - timedelta(days=7)
    elif period == '30d':
        start_date = end_date - timedelta(days=30)
    elif period == '90d':
        start_date = end_date - timedelta(days=90)
    elif period == '1y':
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=30)  # Default to 30 days
    
    return start_date.isoformat(), end_date.isoformat()

def generate_revenue_report(start_date: str, end_date: str) -> Dict[str, Any]:
    """Generate revenue report for the specified date range"""
    try:
        # Get all bookings in date range
        response = bookings_table.scan(
            FilterExpression='created_at BETWEEN :start_date AND :end_date',
            ExpressionAttributeValues={
                ':start_date': start_date,
                ':end_date': end_date
            }
        )
        
        bookings = response['Items']
        
        total_revenue = Decimal('0')
        total_bookings = len(bookings)
        completed_bookings = 0
        cancelled_bookings = 0
        revenue_by_room_type = {}
        daily_revenue = {}
        
        for booking in bookings:
            booking_date = booking['created_at'][:10]  # Extract date part
            revenue = Decimal(str(booking.get('total_cost', 0)))
            
            total_revenue += revenue
            
            # Count by status
            if booking.get('status') == 'completed':
                completed_bookings += 1
            elif booking.get('status') == 'cancelled':
                cancelled_bookings += 1
            
            # Revenue by room type
            room_type = booking.get('room_type', 'Unknown')
            if room_type not in revenue_by_room_type:
                revenue_by_room_type[room_type] = Decimal('0')
            revenue_by_room_type[room_type] += revenue
            
            # Daily revenue
            if booking_date not in daily_revenue:
                daily_revenue[booking_date] = Decimal('0')
            daily_revenue[booking_date] += revenue
        
        average_booking_value = total_revenue / total_bookings if total_bookings > 0 else Decimal('0')
        
        return {
            'total_revenue': total_revenue,
            'total_bookings': total_bookings,
            'completed_bookings': completed_bookings,
            'cancelled_bookings': cancelled_bookings,
            'average_booking_value': average_booking_value,
            'revenue_by_room_type': revenue_by_room_type,
            'daily_revenue': daily_revenue
        }
        
    except Exception as e:
        logger.error(f"Error generating revenue report: {str(e)}")
        raise

def generate_occupancy_report(start_date: str, end_date: str) -> Dict[str, Any]:
    """Generate occupancy report for the specified date range"""
    try:
        # Get all rooms
        rooms_response = rooms_table.scan()
        rooms = rooms_response['Items']
        
        # Get all bookings in date range
        bookings_response = bookings_table.scan(
            FilterExpression='created_at BETWEEN :start_date AND :end_date',
            ExpressionAttributeValues={
                ':start_date': start_date,
                ':end_date': end_date
            }
        )
        
        bookings = bookings_response['Items']
        
        room_occupancy = {}
        total_nights = 0
        booked_nights = 0
        
        for room in rooms:
            room_id = room['room_id']
            room_type = room.get('type', 'Unknown')
            
            if room_type not in room_occupancy:
                room_occupancy[room_type] = {
                    'total_rooms': 0,
                    'total_bookings': 0,
                    'total_nights': 0,
                    'booked_nights': 0
                }
            
            room_occupancy[room_type]['total_rooms'] += 1
            
            # Calculate nights for this room
            room_bookings = [b for b in bookings if b.get('room_id') == room_id]
            for booking in room_bookings:
                check_in = datetime.fromisoformat(booking['check_in_date'].replace('Z', '+00:00'))
                check_out = datetime.fromisoformat(booking['check_out_date'].replace('Z', '+00:00'))
                nights = (check_out - check_in).days
                
                room_occupancy[room_type]['total_bookings'] += 1
                room_occupancy[room_type]['booked_nights'] += nights
                booked_nights += nights
            
            # Calculate total possible nights (simplified - using 30 days)
            days_in_period = 30  # Simplified calculation
            room_occupancy[room_type]['total_nights'] += days_in_period
            total_nights += days_in_period
        
        # Calculate occupancy rates
        for room_type in room_occupancy:
            if room_occupancy[room_type]['total_nights'] > 0:
                room_occupancy[room_type]['occupancy_rate'] = (
                    room_occupancy[room_type]['booked_nights'] / 
                    room_occupancy[room_type]['total_nights']
                ) * 100
            else:
                room_occupancy[room_type]['occupancy_rate'] = 0
        
        overall_occupancy_rate = (booked_nights / total_nights * 100) if total_nights > 0 else 0
        
        return {
            'overall_occupancy_rate': overall_occupancy_rate,
            'room_type_occupancy': room_occupancy,
            'total_rooms': len(rooms),
            'total_bookings': len(bookings)
        }
        
    except Exception as e:
        logger.error(f"Error generating occupancy report: {str(e)}")
        raise

def generate_customer_report(start_date: str, end_date: str) -> Dict[str, Any]:
    """Generate customer analytics report for the specified date range"""
    try:
        # Get all users
        users_response = users_table.scan()
        users = users_response['Items']
        
        # Get all bookings in date range
        bookings_response = bookings_table.scan(
            FilterExpression='created_at BETWEEN :start_date AND :end_date',
            ExpressionAttributeValues={
                ':start_date': start_date,
                ':end_date': end_date
            }
        )
        
        bookings = bookings_response['Items']
        
        # Get all reviews
        reviews_response = reviews_table.scan()
        reviews = reviews_response['Items']
        
        total_customers = len([u for u in users if u.get('role') == 'USER'])
        new_customers = len([u for u in users if u.get('role') == 'USER' and 
                           u.get('created_at', '') >= start_date])
        
        # Customer booking analysis
        customer_bookings = {}
        for booking in bookings:
            user_id = booking.get('user_id', 'Unknown')
            if user_id not in customer_bookings:
                customer_bookings[user_id] = {
                    'total_bookings': 0,
                    'total_spent': Decimal('0'),
                    'last_booking': None
                }
            
            customer_bookings[user_id]['total_bookings'] += 1
            customer_bookings[user_id]['total_spent'] += Decimal(str(booking.get('total_cost', 0)))
            
            booking_date = booking.get('created_at')
            if (not customer_bookings[user_id]['last_booking'] or 
                booking_date > customer_bookings[user_id]['last_booking']):
                customer_bookings[user_id]['last_booking'] = booking_date
        
        # Calculate metrics
        repeat_customers = len([c for c in customer_bookings.values() if c['total_bookings'] > 1])
        average_bookings_per_customer = (
            sum(c['total_bookings'] for c in customer_bookings.values()) / 
            len(customer_bookings) if customer_bookings else 0
        )
        
        # Review analysis
        total_reviews = len(reviews)
        average_rating = (
            sum(float(r.get('rating', 0)) for r in reviews) / 
            total_reviews if total_reviews > 0 else 0
        )
        
        return {
            'total_customers': total_customers,
            'new_customers': new_customers,
            'repeat_customers': repeat_customers,
            'repeat_customer_rate': (repeat_customers / total_customers * 100) if total_customers > 0 else 0,
            'average_bookings_per_customer': average_bookings_per_customer,
            'total_reviews': total_reviews,
            'average_rating': round(average_rating, 2),
            'customer_lifetime_value': float(
                sum(c['total_spent'] for c in customer_bookings.values()) / 
                len(customer_bookings) if customer_bookings else 0
            )
        }
        
    except Exception as e:
        logger.error(f"Error generating customer report: {str(e)}")
        raise

def lambda_handler(event, context):
    """Main Lambda handler for admin reports"""
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Extract user role from claims
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_role = claims.get('custom:role', 'USER')
        
        # Only admins can access reports
        if user_role != 'ADMIN':
            return cors_response(403, {
                'error': 'Access denied. Admin role required.'
            })
        
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        report_type = query_params.get('type', 'revenue')
        period = query_params.get('period', '30d')
        
        # Get date range
        start_date, end_date = get_date_range(period)
        
        # Generate the requested report
        if report_type == 'revenue':
            report_data = generate_revenue_report(start_date, end_date)
        elif report_type == 'occupancy':
            report_data = generate_occupancy_report(start_date, end_date)
        elif report_type == 'customer':
            report_data = generate_customer_report(start_date, end_date)
        else:
            return cors_response(400, {
                'error': f'Invalid report type: {report_type}. Supported types: revenue, occupancy, customer'
            })
        
        return cors_response(200, {
            'report_type': report_type,
            'period': period,
            'start_date': start_date,
            'end_date': end_date,
            'data': report_data
        })
        
    except Exception as e:
        logger.error(f"Error in admin_reports_handler: {str(e)}")
        return cors_response(500, {
            'error': 'Internal server error',
            'message': str(e)
        }) 