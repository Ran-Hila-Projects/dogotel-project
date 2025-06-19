// CORS utility functions for Node.js Lambda handlers

function extractOriginFromEvent(event) {
    const headers = event.headers || {};
    return headers.origin || headers.Origin || '*';
}

function corsResponse(statusCode, body, origin = '*') {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}

function corsErrorResponse(statusCode, message, origin = '*') {
    return corsResponse(statusCode, { error: message }, origin);
}

function handlePreflightRequest(event, origin = '*') {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Max-Age': '86400'
        },
        body: ''
    };
}

function isAdmin(event) {
    // Simple admin check - in production this would verify JWT token
    const headers = event.headers || {};
    const auth = headers.authorization || headers.Authorization || '';
    
    // For now, just check for admin role in headers
    // In production, decode JWT and check custom:role claim
    return auth.includes('admin') || auth.includes('ADMIN');
}

module.exports = {
    extractOriginFromEvent,
    corsResponse,
    corsErrorResponse,
    handlePreflightRequest,
    isAdmin
}; 