import json
import boto3
import logging
from decimal import Decimal
import uuid
from datetime import datetime
import os
from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')

# Table references
rooms_table = dynamodb.Table(os.environ['ROOMS_TABLE'])
users_table = dynamodb.Table(os.environ['USERS_TABLE'])

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
        'body': json.dumps(body, default=str)
    }

def create_sample_rooms():
    """Create sample rooms with different types and pricing"""
    sample_rooms = [
        {
            'room_id': str(uuid.uuid4()),
            'name': 'Cozy Cabin Suite',
            'type': 'Standard',
            'description': 'A comfortable standard room perfect for medium-sized dogs. Features include a cozy bed, toys, and regular playtime.',
            'capacity': 2,
            'price_per_night': Decimal('35.00'),
            'amenities': ['Indoor Play Area', 'Comfortable Bedding', 'Toys', 'Regular Walks'],
            'size_sqft': 48,
            'available': True,
            'images': [
                'https://example.com/room1-1.jpg',
                'https://example.com/room1-2.jpg'
            ],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        },
        {
            'room_id': str(uuid.uuid4()),
            'name': 'Luxury Palace Suite',
            'type': 'Luxury',
            'description': 'Our premium luxury suite with spacious accommodations, premium amenities, and personalized care for your special pet.',
            'capacity': 1,
            'price_per_night': Decimal('85.00'),
            'amenities': ['Private Outdoor Run', 'Premium Bedding', 'Personalized Care', 'Gourmet Treats', 'Grooming Service'],
            'size_sqft': 120,
            'available': True,
            'images': [
                'https://example.com/room2-1.jpg',
                'https://example.com/room2-2.jpg'
            ],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        },
        {
            'room_id': str(uuid.uuid4()),
            'name': 'Economy Comfort Den',
            'type': 'Economy',
            'description': 'An affordable option that doesn\'t compromise on care. Perfect for budget-conscious pet parents.',
            'capacity': 3,
            'price_per_night': Decimal('25.00'),
            'amenities': ['Shared Play Area', 'Basic Bedding', 'Daily Walks'],
            'size_sqft': 32,
            'available': True,
            'images': [
                'https://example.com/room3-1.jpg'
            ],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        },
        {
            'room_id': str(uuid.uuid4()),
            'name': 'The Presidential Paw Suite',
            'type': 'Luxury',
            'description': 'The ultimate in luxury pet boarding. Spacious suite with private garden access and 24/7 personalized attention.',
            'capacity': 1,
            'price_per_night': Decimal('120.00'),
            'amenities': ['Private Garden', 'Premium Bedding', '24/7 Care', 'Gourmet Meals', 'Spa Services', 'Live Webcam'],
            'size_sqft': 200,
            'available': True,
            'images': [
                'https://example.com/room4-1.jpg',
                'https://example.com/room4-2.jpg',
                'https://example.com/room4-3.jpg'
            ],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        },
        {
            'room_id': str(uuid.uuid4()),
            'name': 'Family Pack Lodge',
            'type': 'Standard',
            'description': 'Perfect for families with multiple dogs. Spacious room designed for comfort and socialization.',
            'capacity': 4,
            'price_per_night': Decimal('55.00'),
            'amenities': ['Large Play Area', 'Multiple Beds', 'Group Activities', 'Extended Playtime'],
            'size_sqft': 80,
            'available': True,
            'images': [
                'https://example.com/room5-1.jpg'
            ],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        },
        {
            'room_id': str(uuid.uuid4()),
            'name': 'Budget Buddy Bunk',
            'type': 'Economy',
            'description': 'Simple, clean, and comfortable accommodations at an unbeatable price.',
            'capacity': 2,
            'price_per_night': Decimal('20.00'),
            'amenities': ['Shared Play Area', 'Basic Bedding', 'Daily Walks', 'Group Activities'],
            'size_sqft': 28,
            'available': True,
            'images': [
                'https://example.com/room6-1.jpg'
            ],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
    ]
    
    # Insert rooms into DynamoDB
    success_count = 0
    for room in sample_rooms:
        try:
            rooms_table.put_item(Item=room)
            success_count += 1
            logger.info(f"Created room: {room['name']}")
        except Exception as e:
            logger.error(f"Error creating room {room['name']}: {str(e)}")
    
    return success_count, len(sample_rooms)

def create_admin_user():
    """Create a default admin user"""
    try:
        user_pool_id = os.environ['USER_POOL_ID']
        admin_email = 'admin@dogotel.com'
        temp_password = 'TempPass123!'
        
        # Create user in Cognito
        try:
            cognito.admin_create_user(
                UserPoolId=user_pool_id,
                Username=admin_email,
                UserAttributes=[
                    {
                        'Name': 'email',
                        'Value': admin_email
                    },
                    {
                        'Name': 'custom:role',
                        'Value': 'ADMIN'
                    },
                    {
                        'Name': 'email_verified',
                        'Value': 'true'
                    }
                ],
                TemporaryPassword=temp_password,
                MessageAction='SUPPRESS'  # Don't send welcome email
            )
            
            # Set permanent password
            cognito.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=admin_email,
                Password='AdminPass123!',
                Permanent=True
            )
            
            logger.info(f"Created Cognito admin user: {admin_email}")
            
        except cognito.exceptions.UsernameExistsException:
            logger.info(f"Admin user {admin_email} already exists in Cognito")
        
        # Create user record in DynamoDB
        admin_user = {
            'user_id': admin_email,
            'email': admin_email,
            'first_name': 'Admin',
            'last_name': 'User',
            'phone': '+1-555-0123',
            'role': 'ADMIN',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'is_active': True
        }
        
        users_table.put_item(Item=admin_user)
        logger.info(f"Created DynamoDB admin user record: {admin_email}")
        
        return True, admin_email
        
    except Exception as e:
        logger.error(f"Error creating admin user: {str(e)}")
        return False, str(e)

def create_sample_user():
    """Create a sample regular user"""
    try:
        user_pool_id = os.environ['USER_POOL_ID']
        user_email = 'user@example.com'
        temp_password = 'TempPass123!'
        
        # Create user in Cognito
        try:
            cognito.admin_create_user(
                UserPoolId=user_pool_id,
                Username=user_email,
                UserAttributes=[
                    {
                        'Name': 'email',
                        'Value': user_email
                    },
                    {
                        'Name': 'custom:role',
                        'Value': 'USER'
                    },
                    {
                        'Name': 'email_verified',
                        'Value': 'true'
                    }
                ],
                TemporaryPassword=temp_password,
                MessageAction='SUPPRESS'  # Don't send welcome email
            )
            
            # Set permanent password
            cognito.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=user_email,
                Password='UserPass123!',
                Permanent=True
            )
            
            logger.info(f"Created Cognito sample user: {user_email}")
            
        except cognito.exceptions.UsernameExistsException:
            logger.info(f"Sample user {user_email} already exists in Cognito")
        
        # Create user record in DynamoDB
        sample_user = {
            'user_id': user_email,
            'email': user_email,
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '+1-555-0456',
            'role': 'USER',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'is_active': True
        }
        
        users_table.put_item(Item=sample_user)
        logger.info(f"Created DynamoDB sample user record: {user_email}")
        
        return True, user_email
        
    except Exception as e:
        logger.error(f"Error creating sample user: {str(e)}")
        return False, str(e)

def lambda_handler(event, context):
    """Initialize the database with sample data"""
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        logger.info("Starting database initialization...")
        
        results = {
            'rooms': {},
            'users': {},
            'errors': []
        }
        
        # Create sample rooms
        try:
            rooms_created, total_rooms = create_sample_rooms()
            results['rooms'] = {
                'created': rooms_created,
                'total': total_rooms,
                'success': rooms_created == total_rooms
            }
            logger.info(f"Room creation result: {rooms_created}/{total_rooms} successful")
        except Exception as e:
            error_msg = f"Error creating rooms: {str(e)}"
            logger.error(error_msg)
            results['errors'].append(error_msg)
            results['rooms'] = {'created': 0, 'total': 0, 'success': False}
        
        # Create admin user
        try:
            admin_success, admin_result = create_admin_user()
            results['users']['admin'] = {
                'success': admin_success,
                'email': admin_result if admin_success else None,
                'error': admin_result if not admin_success else None
            }
        except Exception as e:
            error_msg = f"Error creating admin user: {str(e)}"
            logger.error(error_msg)
            results['errors'].append(error_msg)
            results['users']['admin'] = {'success': False, 'error': error_msg}
        
        # Create sample user
        try:
            user_success, user_result = create_sample_user()
            results['users']['sample'] = {
                'success': user_success,
                'email': user_result if user_success else None,
                'error': user_result if not user_success else None
            }
        except Exception as e:
            error_msg = f"Error creating sample user: {str(e)}"
            logger.error(error_msg)
            results['errors'].append(error_msg)
            results['users']['sample'] = {'success': False, 'error': error_msg}
        
        # Determine overall success
        overall_success = (
            results['rooms']['success'] and
            results['users']['admin']['success'] and
            results['users']['sample']['success']
        )
        
        response_data = {
            'message': 'Database initialization completed',
            'success': overall_success,
            'results': results,
            'timestamp': datetime.now().isoformat()
        }
        
        if overall_success:
            response_data['credentials'] = {
                'admin': {
                    'email': 'admin@dogotel.com',
                    'password': 'AdminPass123!',
                    'role': 'ADMIN'
                },
                'user': {
                    'email': 'user@example.com',
                    'password': 'UserPass123!',
                    'role': 'USER'
                }
            }
        
        logger.info(f"Database initialization completed. Success: {overall_success}")
        
        return cors_response(200 if overall_success else 207, response_data)
        
    except Exception as e:
        logger.error(f"Critical error in initialize_data_handler: {str(e)}")
        return cors_response(500, {
            'error': 'Critical error during initialization',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }) 