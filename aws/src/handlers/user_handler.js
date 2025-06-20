const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { corsResponse, corsErrorResponse, handlePreflightRequest, extractOriginFromEvent } = require('./cors_utils');

// Initialize AWS client
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE || 'DogotelUsers';

exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const httpMethod = event.httpMethod;
        const path = event.path;
        const origin = extractOriginFromEvent(event);

        console.log(`Processing ${httpMethod} ${path} from origin: ${origin}`);

        // Handle preflight OPTIONS requests
        if (httpMethod === 'OPTIONS') {
            return handlePreflightRequest(event, origin);
        }

        if (path.startsWith('/user/') && httpMethod === 'GET') {
            // Handle GET /user/:email for user profile
            const email = path.split('/user/')[1];
            return await handleGetUserProfile(event, email);
        } else if (path === '/user/profile-photo' && httpMethod === 'POST') {
            // Handle POST /user/profile-photo for updating profile photo
            return await handleUpdateProfilePhoto(event);
        } else if (path === '/user/profile' && httpMethod === 'PUT') {
            // Handle PUT /user/profile for updating user profile
            return await handleUpdateUserProfile(event);
        } else {
            return corsErrorResponse(404, 'Endpoint not found', origin);
        }
    } catch (error) {
        console.error('Error in user handler:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
};

async function handleGetUserProfile(event, userEmail) {
    try {
        const origin = extractOriginFromEvent(event);

        if (!userEmail) {
            return corsErrorResponse(400, 'User email is required', origin);
        }

        // Get user from DynamoDB
        const result = await docClient.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { email: userEmail }
        }));

        if (!result.Item) {
            // If user doesn't exist, create a default profile
            const defaultUser = {
                email: userEmail,
                username: userEmail.split('@')[0], // Use part before @ as username
                birthdate: '1990-01-01',
                photo: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_active: true
            };

            // Save default user to database
            await docClient.send(new PutCommand({
                TableName: USERS_TABLE,
                Item: defaultUser
            }));

            return corsResponse(200, {
                success: true,
                user: {
                    username: defaultUser.username,
                    birthdate: defaultUser.birthdate,
                    email: defaultUser.email,
                    photo: defaultUser.photo
                }
            }, origin);
        }

        // Return existing user profile
        const userData = result.Item;
        let displayName = userData.username;
        
        // If no username but has firstName/lastName from signup, use those
        if (!displayName && userData.firstName && userData.lastName) {
            displayName = `${userData.firstName} ${userData.lastName}`;
        } else if (!displayName) {
            displayName = userData.email.split('@')[0]; // Fallback to email prefix
        }

        return corsResponse(200, {
            success: true,
            user: {
                username: displayName,
                birthdate: userData.birthdate || userData.birth_date || '',
                email: userData.email,
                photo: userData.photo || userData.profilePhoto || '',
                firstName: userData.firstName || '',
                lastName: userData.lastName || ''
            }
        }, origin);
    } catch (error) {
        console.error('Get user profile error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleUpdateProfilePhoto(event) {
    try {
        const origin = extractOriginFromEvent(event);
        const body = JSON.parse(event.body);
        const { email, photo } = body;

        if (!email || !photo) {
            return corsErrorResponse(400, 'Email and photo are required', origin);
        }

        // Update user profile photo in DynamoDB using UpdateCommand to preserve other data
        const result = await docClient.send(new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { email: email },
            UpdateExpression: 'SET photo = :photo, updated_at = :updated_at',
            ExpressionAttributeValues: {
                ':photo': photo,
                ':updated_at': new Date().toISOString()
            }
        }));

        return corsResponse(200, {
            success: true,
            message: 'Profile photo updated successfully',
            photoUrl: photo
        }, origin);

    } catch (error) {
        console.error('Update profile photo error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleUpdateUserProfile(event) {
    try {
        const origin = extractOriginFromEvent(event);
        const body = JSON.parse(event.body);
        const { email, username, birthdate, photo } = body;

        if (!email) {
            return corsErrorResponse(400, 'Email is required', origin);
        }

        // Build update expression dynamically
        const updateExpressions = [];
        const expressionAttributeValues = {
            ':updated_at': new Date().toISOString()
        };

        if (username) {
            updateExpressions.push('username = :username');
            expressionAttributeValues[':username'] = username;
        }

        if (birthdate) {
            updateExpressions.push('birthdate = :birthdate');
            expressionAttributeValues[':birthdate'] = birthdate;
        }

        if (photo !== undefined) {
            updateExpressions.push('photo = :photo');
            expressionAttributeValues[':photo'] = photo;
        }

        updateExpressions.push('updated_at = :updated_at');

        // Update user profile in DynamoDB
        const result = await docClient.send(new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { email: email },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }));

        return corsResponse(200, {
            success: true,
            message: 'Profile updated successfully',
            user: {
                username: result.Attributes.username,
                birthdate: result.Attributes.birthdate,
                email: result.Attributes.email,
                photo: result.Attributes.photo || ''
            }
        }, origin);

    } catch (error) {
        console.error('Update user profile error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}