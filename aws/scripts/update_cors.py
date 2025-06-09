#!/usr/bin/env python3
"""
Script to update all Lambda handlers to use the new CORS utilities
Run this script to migrate from old get_cors_headers() to new cors_utils
"""

import os
import re
from pathlib import Path

def update_handler_file(file_path: Path):
    """Update a single handler file to use new CORS utilities"""
    
    print(f"Updating {file_path}...")
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Track if we made changes
    changed = False
    
    # 1. Add cors_utils import if not present
    if 'from cors_utils import' not in content:
        import_pattern = r'(import os.*?\n)'
        import_replacement = r'\1from cors_utils import cors_response, cors_error_response, handle_preflight_request, extract_origin_from_event\n'
        content = re.sub(import_pattern, import_replacement, content, flags=re.DOTALL)
        changed = True
    
    # 2. Update lambda_handler to handle OPTIONS and extract origin
    old_handler_pattern = r'def lambda_handler\(event, context\):\s*""".*?"""\s*try:\s*http_method = event\[\'httpMethod\'\]\s*path = event\[\'path\'\]'
    new_handler_replacement = '''def lambda_handler(event, context):
    """Main Lambda handler"""
    try:
        http_method = event['httpMethod']
        path = event['path']
        origin = extract_origin_from_event(event)
        
        print(f"Processing {http_method} {path} from origin: {origin}")
        
        # Handle preflight OPTIONS requests
        if http_method == 'OPTIONS':
            return handle_preflight_request(event, origin=origin)'''
    
    if 'if http_method == \'OPTIONS\':' not in content:
        content = re.sub(old_handler_pattern, new_handler_replacement, content, flags=re.DOTALL)
        changed = True
    
    # 3. Replace 404 error responses
    old_404_pattern = r'return\s*{\s*\'statusCode\':\s*404,\s*\'headers\':\s*get_cors_headers\(\),\s*\'body\':\s*json\.dumps\(\{\'error\':\s*\'.*?\'\}\)\s*}'
    new_404_replacement = "return cors_error_response(404, 'Endpoint not found', origin)"
    content = re.sub(old_404_pattern, new_404_replacement, content, flags=re.DOTALL)
    
    # 4. Replace 500 error responses in main handler
    old_500_pattern = r'return\s*{\s*\'statusCode\':\s*500,.*?\'body\':\s*json\.dumps\(\{\'error\':\s*\'.*?\'\}\)\s*}'
    new_500_replacement = "return cors_error_response(500, 'Internal server error', extract_origin_from_event(event))"
    content = re.sub(old_500_pattern, new_500_replacement, content, flags=re.DOTALL)
    
    # 5. Add origin extraction to individual handlers
    handler_functions = re.findall(r'def (handle_\w+)\(event\):', content)
    for func_name in handler_functions:
        # Add origin extraction at the start of each handler function
        old_func_pattern = f'def {func_name}\\(event\\):\\s*""".*?"""\\s*try:'
        new_func_replacement = f'def {func_name}(event):\n    """Handle function"""\n    try:\n        origin = extract_origin_from_event(event)'
        if f'origin = extract_origin_from_event(event)' not in content:
            content = re.sub(old_func_pattern, new_func_replacement, content, flags=re.DOTALL)
            changed = True
    
    # 6. Replace simple error responses
    simple_error_pattern = r'return\s*{\s*\'statusCode\':\s*(\d+),\s*\'headers\':\s*get_cors_headers\(\),\s*\'body\':\s*json\.dumps\(\{\'error\':\s*([\'"])(.*?)\2\}\)\s*}'
    def replace_simple_error(match):
        status_code = match.group(1)
        error_message = match.group(3)
        return f"return cors_error_response({status_code}, '{error_message}', origin)"
    
    content = re.sub(simple_error_pattern, replace_simple_error, content)
    
    # 7. Replace success responses
    success_pattern = r'return\s*{\s*\'statusCode\':\s*(\d+),\s*\'headers\':\s*get_cors_headers\(\),\s*\'body\':\s*json\.dumps\((.*?)\)\s*}'
    def replace_success(match):
        status_code = match.group(1)
        body_content = match.group(2)
        return f"return cors_response({status_code}, {body_content}, origin)"
    
    content = re.sub(success_pattern, replace_success, content, flags=re.DOTALL)
    
    # 8. Remove old get_cors_headers function
    old_cors_function = r'\ndef get_cors_headers\(\):.*?return\s*{.*?}\s*'
    content = re.sub(old_cors_function, '', content, flags=re.DOTALL)
    
    # Write back if changed
    if changed:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Updated {file_path}")
    else:
        print(f"ℹ️  No changes needed for {file_path}")

def main():
    """Main function to update all handler files"""
    
    handlers_dir = Path(__file__).parent.parent / 'src' / 'handlers'
    
    # Find all handler files except cors_utils.py and auth_handler.py (already updated)
    handler_files = [
        f for f in handlers_dir.glob('*_handler.py') 
        if f.name not in ['cors_utils.py', 'auth_handler.py']
    ]
    
    print(f"Found {len(handler_files)} handler files to update:")
    for file_path in handler_files:
        print(f"  - {file_path.name}")
    
    print("\nStarting updates...")
    
    for file_path in handler_files:
        try:
            update_handler_file(file_path)
        except Exception as e:
            print(f"❌ Error updating {file_path}: {e}")
    
    print("\n✅ CORS update completed!")
    print("\nNext steps:")
    print("1. Review the updated files")
    print("2. Test the changes")
    print("3. Deploy with: sam build && sam deploy")

if __name__ == '__main__':
    main() 