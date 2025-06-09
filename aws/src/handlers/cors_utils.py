"""
CORS (Cross-Origin Resource Sharing) utilities for Dogotel API
Comprehensive CORS handling to prevent common CORS issues in AWS API Gateway + Lambda
"""

import json
import logging
from typing import Dict, Any, Optional, List, Union

logger = logging.getLogger()

def get_cors_headers(
    origin: Optional[str] = None,
    allow_credentials: bool = True,
    max_age: int = 86400,
    additional_headers: Optional[Dict[str, str]] = None
) -> Dict[str, str]:
    """
    Get comprehensive CORS headers that solve common CORS issues
    
    Args:
        origin: Specific origin to allow (if None, allows all with '*')
        allow_credentials: Whether to allow credentials
        max_age: Cache time for preflight requests in seconds
        additional_headers: Any additional headers to include
    
    Returns:
        Dict with all necessary CORS headers
    """
    
    # Base CORS headers that solve most common issues
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin if origin else '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD',
        'Access-Control-Allow-Headers': ','.join([
            'Accept',
            'Accept-Language',
            'Authorization',
            'Content-Language', 
            'Content-Type',
            'Origin',
            'Referer',
            'User-Agent',
            'X-Amz-Date',
            'X-Amz-Security-Token',
            'X-Api-Key',
            'X-Requested-With',
            'X-Forwarded-For',
            'X-Real-IP',
            'Cache-Control',
            'Pragma'
        ]),
        'Access-Control-Max-Age': str(max_age),
        'Access-Control-Expose-Headers': 'Date,X-Amzn-RequestId,X-Amzn-ErrorType',
        'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
    }
    
    # Only add credentials header if origin is specific (not '*')
    if allow_credentials and origin and origin != '*':
        headers['Access-Control-Allow-Credentials'] = 'true'
    elif allow_credentials and not origin:
        # If no specific origin but credentials needed, default to common localhost
        headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        headers['Access-Control-Allow-Credentials'] = 'true'
    
    # Add any additional headers
    if additional_headers:
        headers.update(additional_headers)
    
    return headers

def cors_response(
    status_code: int,
    body: Any,
    origin: Optional[str] = None,
    allow_credentials: bool = True,
    additional_headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Create a complete Lambda response with proper CORS headers
    
    Args:
        status_code: HTTP status code
        body: Response body (will be JSON serialized)
        origin: Specific origin to allow
        allow_credentials: Whether to allow credentials
        additional_headers: Any additional headers
    
    Returns:
        Complete Lambda response dict
    """
    
    # Ensure body is JSON serializable
    if isinstance(body, (dict, list)):
        json_body = json.dumps(body, default=str)
    elif isinstance(body, str):
        json_body = body
    else:
        json_body = json.dumps({"data": body}, default=str)
    
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(origin, allow_credentials, additional_headers=additional_headers),
        'body': json_body
    }

def handle_preflight_request(
    event: Dict[str, Any],
    allowed_methods: Optional[List[str]] = None,
    allowed_headers: Optional[List[str]] = None,
    origin: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handle OPTIONS preflight requests properly
    
    Args:
        event: Lambda event object
        allowed_methods: List of allowed HTTP methods
        allowed_headers: List of allowed headers
        origin: Specific origin to allow
    
    Returns:
        Proper preflight response
    """
    
    # Get request origin
    request_origin = event.get('headers', {}).get('Origin') or event.get('headers', {}).get('origin')
    
    # Use provided origin or detect from request
    response_origin = origin or request_origin or '*'
    
    # Default allowed methods if not specified
    if not allowed_methods:
        allowed_methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
    
    # Get requested headers from preflight request
    requested_headers = event.get('headers', {}).get('Access-Control-Request-Headers', '')
    if requested_headers and not allowed_headers:
        # If headers are requested but not specified, allow the requested ones plus common ones
        requested_headers_list = [h.strip() for h in requested_headers.split(',')]
        allowed_headers = list(set(requested_headers_list + [
            'Authorization', 'Content-Type', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'
        ]))
    
    # Build preflight response headers
    preflight_headers = {
        'Access-Control-Allow-Origin': response_origin,
        'Access-Control-Allow-Methods': ','.join(allowed_methods),
        'Access-Control-Allow-Headers': ','.join(allowed_headers) if allowed_headers else '*',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true' if response_origin != '*' else 'false',
        'Content-Type': 'application/json'
    }
    
    logger.info(f"Preflight request handled for origin: {response_origin}")
    
    return {
        'statusCode': 200,
        'headers': preflight_headers,
        'body': json.dumps({'message': 'CORS preflight handled'})
    }

def extract_origin_from_event(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract origin from Lambda event in various possible locations
    
    Args:
        event: Lambda event object
    
    Returns:
        Origin string if found, None otherwise
    """
    
    # Try different possible locations for origin
    headers = event.get('headers', {})
    
    # Case-insensitive header lookup
    origin_keys = ['Origin', 'origin', 'ORIGIN']
    for key in origin_keys:
        if key in headers:
            return headers[key]
    
    # Check in multiValueHeaders if present
    multi_headers = event.get('multiValueHeaders', {})
    for key in origin_keys:
        if key in multi_headers and multi_headers[key]:
            return multi_headers[key][0]  # Take first value
    
    # Check request context
    request_context = event.get('requestContext', {})
    if 'domainName' in request_context:
        protocol = 'https' if request_context.get('protocol', '').startswith('HTTPS') else 'http'
        return f"{protocol}://{request_context['domainName']}"
    
    return None

def is_cors_enabled_origin(origin: str, allowed_origins: List[str]) -> bool:
    """
    Check if origin is in allowed origins list
    
    Args:
        origin: Origin to check
        allowed_origins: List of allowed origins (can include wildcards)
    
    Returns:
        True if origin is allowed
    """
    
    if not origin:
        return False
    
    # Check for exact matches first
    if origin in allowed_origins:
        return True
    
    # Check for wildcard matches
    for allowed in allowed_origins:
        if '*' in allowed:
            # Simple wildcard matching (you could make this more sophisticated)
            if allowed == '*':
                return True
            # Remove protocol and check domain
            if allowed.startswith('*.'):
                domain_pattern = allowed[2:]  # Remove *.
                origin_domain = origin.split('://')[-1] if '://' in origin else origin
                if origin_domain.endswith(domain_pattern):
                    return True
    
    return False

def validate_cors_request(
    event: Dict[str, Any],
    allowed_origins: Optional[List[str]] = None,
    allowed_methods: Optional[List[str]] = None
) -> tuple[bool, Optional[str]]:
    """
    Validate if CORS request should be allowed
    
    Args:
        event: Lambda event object
        allowed_origins: List of allowed origins
        allowed_methods: List of allowed methods
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    
    method = event.get('httpMethod', '').upper()
    origin = extract_origin_from_event(event)
    
    # If no origin, it's not a CORS request (same-origin)
    if not origin:
        return True, None
    
    # Check allowed origins
    if allowed_origins:
        if not is_cors_enabled_origin(origin, allowed_origins):
            return False, f"Origin '{origin}' not allowed"
    
    # Check allowed methods
    if allowed_methods:
        if method not in [m.upper() for m in allowed_methods]:
            return False, f"Method '{method}' not allowed"
    
    return True, None

# Development/testing origins (common localhost ports)
DEV_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081'
]

# Production origins (you would customize this)
PROD_ORIGINS = [
    'https://dogotel.com',
    'https://www.dogotel.com',
    'https://app.dogotel.com'
]

def get_environment_origins(environment: str = 'dev') -> List[str]:
    """
    Get appropriate origins for environment
    
    Args:
        environment: Environment name (dev, prod, etc.)
    
    Returns:
        List of allowed origins for the environment
    """
    
    if environment.lower() in ['dev', 'development', 'local']:
        return DEV_ORIGINS + PROD_ORIGINS  # Allow both in dev
    elif environment.lower() in ['prod', 'production']:
        return PROD_ORIGINS
    else:
        return ['*']  # Default to allow all for unknown environments

# Common error responses with CORS headers
def cors_error_response(status_code: int, error_message: str, origin: Optional[str] = None) -> Dict[str, Any]:
    """Return error response with proper CORS headers"""
    return cors_response(
        status_code=status_code,
        body={'error': error_message},
        origin=origin
    )

def cors_success_response(data: Any, origin: Optional[str] = None) -> Dict[str, Any]:
    """Return success response with proper CORS headers"""
    return cors_response(
        status_code=200,
        body=data,
        origin=origin
    ) 