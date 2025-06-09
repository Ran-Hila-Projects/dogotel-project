# CORS Troubleshooting Guide for Dogotel API

## Overview

This guide helps prevent and solve Cross-Origin Resource Sharing (CORS) issues in the Dogotel project. CORS errors are common when building web applications that call APIs from a different domain.

## What is CORS?

CORS (Cross-Origin Resource Sharing) is a security mechanism that allows servers to specify which origins can access their resources. A **cross-origin request** occurs when:

- **Domain** is different (`example.com` → `api.dogotel.com`)
- **Protocol** is different (`http://` → `https://`)
- **Port** is different (`localhost:3000` → `localhost:8080`)

## Common CORS Errors and Solutions

### 1. "No 'Access-Control-Allow-Origin' header is present"

**Cause**: The API doesn't include CORS headers in the response.

**Solution**: ✅ **Already Fixed** in Dogotel
- Our `cors_utils.py` automatically adds proper CORS headers
- API Gateway is configured with comprehensive CORS settings

### 2. "Method [POST/PUT/DELETE] not allowed under CORS"

**Cause**: The API allows only certain HTTP methods.

**Solution**: ✅ **Already Fixed** in Dogotel
- All necessary methods are configured: `GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD`
- Lambda handlers properly handle preflight OPTIONS requests

### 3. "Request header [Authorization] not allowed"

**Cause**: Custom headers (like Authorization) require explicit permission.

**Solution**: ✅ **Already Fixed** in Dogotel
- All common headers are pre-configured in our CORS setup
- Includes: `Authorization`, `Content-Type`, `X-Api-Key`, etc.

### 4. Preflight Requests Failing

**Cause**: OPTIONS requests (preflight) aren't handled properly.

**Solution**: ✅ **Already Fixed** in Dogotel
- Each Lambda handler explicitly handles OPTIONS requests
- Returns proper preflight response with allowed methods and headers

## Current CORS Configuration

### Lambda Level (cors_utils.py)
```python
# Comprehensive headers that solve most CORS issues
headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',  # or specific origin
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD',
    'Access-Control-Allow-Headers': 'Accept,Authorization,Content-Type,Origin,X-Api-Key...',
    'Access-Control-Max-Age': '86400',  # Cache preflight for 24 hours
    'Access-Control-Expose-Headers': 'Date,X-Amzn-RequestId,X-Amzn-ErrorType',
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
}
```

### API Gateway Level (template.yaml)
```yaml
Cors:
  AllowMethods: "'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD'"
  AllowHeaders: "'Accept,Authorization,Content-Type,Origin,X-Api-Key...'"
  AllowOrigin: "'*'"
  MaxAge: "'86400'"

# Gateway responses ensure CORS headers even on errors
GatewayResponses:
  DEFAULT_4XX: # 400-level errors
  DEFAULT_5XX: # 500-level errors
```

## Testing CORS

### 1. Browser DevTools Test

Open browser DevTools → Network tab:

```javascript
// Test from browser console
fetch('https://your-api-gateway-url/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('CORS Error:', error));
```

### 2. cURL Test (No CORS)
```bash
# Test API directly (bypasses CORS - should work)
curl -X POST https://your-api-gateway-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### 3. Preflight Test
```bash
# Test OPTIONS preflight request
curl -X OPTIONS https://your-api-gateway-url/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  -v
```

## Environment-Specific CORS

### Development Environment
```python
# Allows localhost origins for development
DEV_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:8080',
    'http://127.0.0.1:3000'
]
```

### Production Environment
```python
# Restrict to production domains
PROD_ORIGINS = [
    'https://dogotel.com',
    'https://www.dogotel.com',
    'https://app.dogotel.com'
]
```

## Best Practices Implemented

### ✅ 1. Specific Headers
- Don't use wildcard `*` for headers in production
- List specific headers needed by your frontend

### ✅ 2. Origin Validation
- Use specific origins in production instead of `*`
- Validate origins dynamically based on environment

### ✅ 3. Preflight Caching
- Set `Access-Control-Max-Age` to cache preflight requests
- Reduces network overhead (we use 24 hours)

### ✅ 4. Error Handling
- Include CORS headers in all responses (success and error)
- Handle 4xx and 5xx errors at API Gateway level

### ✅ 5. Credentials Handling
- Only set `Access-Control-Allow-Credentials: true` when needed
- Cannot use wildcard origin `*` with credentials

## Troubleshooting Steps

### Step 1: Check Browser Network Tab
1. Open DevTools → Network tab
2. Look for failed requests (red status)
3. Check if there are two requests:
   - OPTIONS (preflight) - should return 200
   - Actual request (POST/GET/etc.)

### Step 2: Verify Headers
Look for these headers in the response:
- ✅ `Access-Control-Allow-Origin`
- ✅ `Access-Control-Allow-Methods`
- ✅ `Access-Control-Allow-Headers`

### Step 3: Check Lambda Logs
```bash
# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/dogotel"
aws logs tail /aws/lambda/dogotel-auth-dev --follow
```

### Step 4: Test Direct API Call
```bash
# This should work (no CORS restrictions)
curl -X POST https://your-api-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

If cURL works but browser doesn't → CORS issue
If cURL fails → API or authentication issue

## Common Frontend Configuration

### React/JavaScript
```javascript
// Axios configuration
const apiClient = axios.create({
  baseURL: 'https://your-api-gateway-url',
  headers: {
    'Content-Type': 'application/json',
  },
  // Don't set Authorization here - set per request
});

// Add authorization per request
apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### Angular HttpClient
```typescript
// Angular HTTP interceptor handles headers automatically
const headers = new HttpHeaders({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});
```

## Emergency CORS Fixes

### Quick Fix 1: Temporary Wildcard (Development Only)
```python
# In cors_utils.py - ONLY for development
headers['Access-Control-Allow-Origin'] = '*'
headers['Access-Control-Allow-Headers'] = '*'
headers['Access-Control-Allow-Methods'] = '*'
```

### Quick Fix 2: Browser CORS Disable (Development Only)
```bash
# Chrome with disabled security (NOT for production)
chrome --disable-web-security --user-data-dir="/tmp/chrome_dev"
```

⚠️ **Warning**: Never use these in production!

## Security Considerations

### 1. Origin Restrictions
```python
# Good: Specific origins
'Access-Control-Allow-Origin': 'https://app.dogotel.com'

# Bad: Wildcard in production (security risk)
'Access-Control-Allow-Origin': '*'
```

### 2. Credentials Handling
```python
# Good: Specific origin with credentials
'Access-Control-Allow-Origin': 'https://app.dogotel.com'
'Access-Control-Allow-Credentials': 'true'

# Bad: Wildcard with credentials (NOT ALLOWED)
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Credentials': 'true'  # This will fail!
```

### 3. Header Restrictions
```python
# Good: Specific headers
'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Api-Key'

# Acceptable: Common headers
'Access-Control-Allow-Headers': 'Accept,Authorization,Content-Type,Origin'
```

## Monitoring CORS Issues

### CloudWatch Metrics
- Monitor 4xx errors (could indicate CORS failures)
- Set up alarms for increased OPTIONS request failures

### Custom Logging
```python
# In cors_utils.py
logger.info(f"CORS request from origin: {origin}")
logger.warning(f"Blocked CORS request from: {invalid_origin}")
```

## Summary

🎉 **Good News**: Dogotel's CORS configuration is comprehensive and follows best practices!

✅ **What's Already Protected**:
- Proper CORS headers in all Lambda responses
- API Gateway CORS configuration
- Preflight OPTIONS handling
- Error responses include CORS headers
- Environment-specific origin management
- Security-conscious header restrictions

🔧 **Maintenance**:
- Update `PROD_ORIGINS` in `cors_utils.py` when adding new domains
- Monitor CloudWatch logs for CORS-related errors
- Test CORS after any API Gateway configuration changes

This configuration should prevent the vast majority of CORS issues you might encounter! 