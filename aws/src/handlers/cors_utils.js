// CORS utility functions for Node.js Lambda handlers
// Optimized for AWS Learner Lab - Maximum permissivity for POC

function extractOriginFromEvent(event) {
    const headers = event.headers || {};
    // Be more lenient with origin detection for learner lab
    return headers.origin || headers.Origin || headers.referer || headers.Referer || '*';
}

function corsResponse(statusCode, body, origin = '*') {
    const headers = {
        'Content-Type': 'application/json',
        // Always allow all origins for learner lab
        'Access-Control-Allow-Origin': '*',
        // Allow all headers - maximum permissivity
        'Access-Control-Allow-Headers': '*',
        // Allow all methods
        'Access-Control-Allow-Methods': '*',
        // Expose all headers
        'Access-Control-Expose-Headers': '*',
        // Cache preflight for 24 hours
        'Access-Control-Max-Age': '86400',
        // Additional headers for compatibility
        'Vary': 'Origin',
        'Cache-Control': 'no-cache'
    };

    // Only add credentials if origin is not wildcard
    if (origin !== '*') {
        headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return {
        statusCode,
        headers,
        body: JSON.stringify(body)
    };
}

function corsErrorResponse(statusCode, message, origin = '*') {
    return corsResponse(statusCode, { error: message }, origin);
}

function handlePreflightRequest(event, origin = '*') {
    const headers = {
        // Always allow all origins for learner lab
        'Access-Control-Allow-Origin': '*',
        // Allow all headers - maximum permissivity
        'Access-Control-Allow-Headers': '*',
        // Allow all methods
        'Access-Control-Allow-Methods': '*',
        // Expose all headers
        'Access-Control-Expose-Headers': '*',
        // Cache preflight for 24 hours
        'Access-Control-Max-Age': '86400',
        // Additional headers for compatibility
        'Vary': 'Origin',
        'Cache-Control': 'no-cache'
    };

    // Only add credentials if origin is not wildcard
    if (origin !== '*') {
        headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return {
        statusCode: 200,
        headers,
        body: ''
    };
}

function isAdmin(event) {
    // Simple admin check - in production this would verify JWT token
    const headers = event.headers || {};
    const auth = headers.authorization || headers.Authorization || '';
    
    // For development/demo purposes, accept any admin token
    // In production, decode JWT and check custom:role claim
    return auth.includes('admin') || auth.includes('ADMIN') || auth.includes('Bearer admin-token');
}

module.exports = {
    extractOriginFromEvent,
    corsResponse,
    corsErrorResponse,
    handlePreflightRequest,
    isAdmin
}; 