import json
import boto3
import os
import uuid
from datetime import datetime
from botocore.exceptions import ClientError
from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event

# Initialize AWS clients
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

# Environment variables
USER_POOL_ID = os.environ['COGNITO_USER_POOL_ID']
CLIENT_ID = os.environ['COGNITO_CLIENT_ID']
USERS_TABLE = os.environ['DYNAMODB_TABLE_USERS']

users_table = dynamodb.Table(USERS_TABLE)

def lambda_handler(event, context):
    """Main Lambda handler for authentication operations"""
    try:
        http_method = event['httpMethod']
        path = event['path']
        origin = extract_origin_from_event(event)
        
        print(f"Processing {http_method} {path} from origin: {origin}")
        
        # Handle preflight OPTIONS requests
        if http_method == 'OPTIONS':
            return handle_preflight_request(event, origin=origin)
        
        if path == '/auth/register' and http_method == 'POST':
            return handle_register(event)
        elif path == '/auth/login' and http_method == 'POST':
            return handle_login(event)
        elif path == '/auth/profile' and http_method == 'GET':
            return handle_get_profile(event)
        else:
            return cors_error_response(404, 'Endpoint not found', origin)
            
    except Exception as e:
        print(f"Error in auth handler: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_register(event):
    """Handle user registration"""
    try:
        origin = extract_origin_from_event(event)
        body = json.loads(event['body'])
        email = body.get('email')
        password = body.get('password')
        name = body.get('name')
        role = body.get('role', 'USER')  # Default to USER role
        
        if not email or not password or not name:
            return cors_error_response(400, 'Email, password, and name are required', origin)
        
        # Create user in Cognito
        user_id = str(uuid.uuid4())
        
        cognito_response = cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {
                    'Name': 'email',
                    'Value': email
                },
                {
                    'Name': 'name',
                    'Value': name
                },
                {
                    'Name': 'custom:role',
                    'Value': role
                },
                {
                    'Name': 'email_verified',
                    'Value': 'true'
                }
            ],
            TemporaryPassword=password,
            MessageAction='SUPPRESS'
        )
        
        # Set permanent password
        cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=email,
            Password=password,
            Permanent=True
        )
        
        # Store user data in DynamoDB
        users_table.put_item(
            Item={
                'user_id': user_id,
                'email': email,
                'name': name,
                'role': role,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
        )
        
        return cors_response(
            status_code=201,
            body={
                'message': 'User registered successfully',
                'user_id': user_id,
                'email': email,
                'name': name,
                'role': role
            },
            origin=origin
        )
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'UsernameExistsException':
            return cors_error_response(400, 'User already exists', origin)
        else:
            print(f"Cognito error: {str(e)}")
            return cors_error_response(400, str(e), origin)
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return cors_error_response(500, 'Registration failed', origin)

def handle_login(event):
    """Handle user login"""
    try:
        origin = extract_origin_from_event(event)
        body = json.loads(event['body'])
        email = body.get('email')
        password = body.get('password')
        
        if not email or not password:
            return cors_error_response(400, 'Email and password are required', origin)
        
        # Authenticate with Cognito
        response = cognito.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            AuthFlow='ADMIN_NO_SRP_AUTH',
            AuthParameters={
                'USERNAME': email,
                'PASSWORD': password
            }
        )
        
        # Get user data from DynamoDB
        user_response = users_table.query(
            IndexName='EmailIndex',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        
        user_data = None
        if user_response['Items']:
            user_data = user_response['Items'][0]
        
        return cors_response(
            status_code=200,
            body={
                'message': 'Login successful',
                'access_token': response['AuthenticationResult']['AccessToken'],
                'id_token': response['AuthenticationResult']['IdToken'],
                'refresh_token': response['AuthenticationResult']['RefreshToken'],
                'expires_in': response['AuthenticationResult']['ExpiresIn'],
                'user_data': user_data
            },
            origin=origin
        )
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NotAuthorizedException':
            return cors_error_response(401, 'Invalid credentials', origin)
        else:
            print(f"Cognito error: {str(e)}")
            return cors_error_response(400, str(e), origin)
    except Exception as e:
        print(f"Login error: {str(e)}")
        return cors_error_response(500, 'Login failed', origin)

def handle_get_profile(event):
    """Handle get user profile"""
    try:
        origin = extract_origin_from_event(event)
        # Extract user info from JWT token (passed through API Gateway authorizer)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        email = claims.get('email')
        
        if not email:
            return cors_error_response(401, 'Unauthorized', origin)
        
        # Get user data from DynamoDB
        user_response = users_table.query(
            IndexName='EmailIndex',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        
        if not user_response['Items']:
            return cors_error_response(404, 'User not found', origin)
        
        user_data = user_response['Items'][0]
        
        return cors_response(
            status_code=200,
            body={
                'user_id': user_data['user_id'],
                'email': user_data['email'],
                'name': user_data['name'],
                'role': user_data['role'],
                'created_at': user_data['created_at']
            },
            origin=origin
        )
        
    except Exception as e:
        print(f"Profile error: {str(e)}")
        return cors_error_response(500, 'Failed to get profile', origin)

 