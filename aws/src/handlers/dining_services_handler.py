import json
import boto3
import os
from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event
from decimal import Decimal
from botocore.exceptions import ClientError

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
DINING_TABLE = os.environ.get('DYNAMODB_TABLE_DINING', 'dogotel-dining-dev')
SERVICES_TABLE = os.environ.get('DYNAMODB_TABLE_SERVICES', 'dogotel-services-dev')

dining_table = dynamodb.Table(DINING_TABLE)
services_table = dynamodb.Table(SERVICES_TABLE)

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
        
        if path.startswith('/dining/') and path.count('/') == 2 and http_method == 'GET':
            dining_id = path.split('/')[-1]
            return handle_get_dining(dining_id, event)
        elif path.startswith('/services/') and path.count('/') == 2 and http_method == 'GET':
            service_id = path.split('/')[-1]
            return handle_get_service(service_id, event)
        elif path == '/dining' and http_method == 'GET':
            return handle_list_dining(event)
        elif path == '/services' and http_method == 'GET':
            return handle_list_services(event)
        else:
            return cors_error_response(404, 'Endpoint not found', origin)
            
    except Exception as e:
        print(f"Error in dining/services handler: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_dining(dining_id, event):
    """Handle getting a specific dining option"""
    try:
        origin = extract_origin_from_event(event)
        
        response = dining_table.get_item(Key={'dining_id': dining_id})
        
        if 'Item' not in response:
            return cors_error_response(404, 'Dining option not found', origin)
        
        dining = convert_decimals(response['Item'])
        
        return cors_response(200, dining, origin)
        
    except Exception as e:
        print(f"Get dining error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_get_service(service_id, event):
    """Handle getting a specific service"""
    try:
        origin = extract_origin_from_event(event)
        
        response = services_table.get_item(Key={'service_id': service_id})
        
        if 'Item' not in response:
            return cors_error_response(404, 'Service not found', origin)
        
        service = convert_decimals(response['Item'])
        
        return cors_response(200, service, origin)
        
    except Exception as e:
        print(f"Get service error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_list_dining(event):
    """Handle listing all dining options - return direct array"""
    try:
        origin = extract_origin_from_event(event)
        
        response = dining_table.scan()
        dining_options = [convert_decimals(item) for item in response['Items']]
        
        # Return direct array to match frontend expectations
        return cors_response(200, dining_options, origin)
        
    except Exception as e:
        print(f"List dining error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

def handle_list_services(event):
    """Handle listing all services - return direct array"""
    try:
        origin = extract_origin_from_event(event)
        
        response = services_table.scan()
        services = [convert_decimals(item) for item in response['Items']]
        
        # Return direct array to match frontend expectations
        return cors_response(200, services, origin)
        
    except Exception as e:
        print(f"List services error: {str(e)}")
        return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))

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