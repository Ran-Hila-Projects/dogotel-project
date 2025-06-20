const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, CreateGroupCommand, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { v4: uuidv4 } = require('uuid');
const { corsResponse, corsErrorResponse, handlePreflightRequest, extractOriginFromEvent } = require('./cors_utils');

// Initialize AWS clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({});

// Environment variables
const ROOMS_TABLE = process.env.ROOMS_TABLE || 'DogotelRooms';
const USERS_TABLE = process.env.USERS_TABLE || 'DogotelUsers';
const USER_POOL_ID = process.env.USER_POOL_ID;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET || process.env.S3_BUCKET;

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

        if (path === '/admin/initialize' && httpMethod === 'POST') {
            return await handleInitializeData(event);
        } else {
            return corsErrorResponse(404, 'Endpoint not found', origin);
        }
    } catch (error) {
        console.error('Error in initialize data handler:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
};

async function handleInitializeData(event) {
    try {
        const origin = extractOriginFromEvent(event);
        const body = JSON.parse(event.body || '{}');
        const { roomsData } = body;

        console.log('Initializing data...');

        const results = {};

        // Create admin group in Cognito
        results.adminGroup = await createAdminGroup();

        // Create admin user
        results.adminUser = await createAdminUser();

        // Create sample rooms if provided
        if (roomsData && Array.isArray(roomsData)) {
            results.rooms = await createRoomsFromData(roomsData);
        } else {
            results.rooms = await createSampleRooms();
        }

        // Create sample dining options
        results.dining = await createSampleDining();

        // Create sample services
        results.services = await createSampleServices();

        return corsResponse(200, {
            success: true,
            message: 'Data initialization completed',
            results: results
        }, origin);
    } catch (error) {
        console.error('Initialize data error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function createSampleRooms() {
    // Generate the S3 image base URL
    const imageBaseUrl = IMAGES_BUCKET ? `https://${IMAGES_BUCKET}.s3.amazonaws.com/images/rooms/` : '';
    
    const sampleRooms = [
        {
            room_id: '1',
            title: 'The Cozy Kennel',
            subtitle: 'Perfect for Solo Nappers 💤',
            description: 'A comfortable and intimate space designed for your dog\'s relaxation and peace. Features premium bedding, climate control, and daily housekeeping.',
            dogsAmount: 1,
            price: 55,
            size: '30m²',
            image: `${imageBaseUrl}room-1.jpg`,
            included: ['Daily housekeeping', 'Premium bedding', 'Climate control', 'Feeding service'],
            reviews: [
                { name: 'Hila', stars: 5, review: 'Perfect for my small dog! Very clean and comfortable.' },
                { name: 'David', stars: 4, review: 'Great service, my dog loved it here.' }
            ],
            is_available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            room_id: '2',
            title: 'Luxury Palace Suite',
            subtitle: 'Royal Treatment Awaits 👑',
            description: 'Our premium luxury suite with spacious accommodations, premium amenities, and personalized care for your special pet.',
            dogsAmount: 1,
            price: 85,
            size: '50m²',
            image: `${imageBaseUrl}room-2.png`,
            included: ['Private outdoor run', 'Premium bedding', 'Personalized care', 'Gourmet treats', 'Grooming service'],
            reviews: [
                { name: 'Sarah', stars: 5, review: 'Absolutely amazing! My dog was treated like royalty.' },
                { name: 'Mike', stars: 5, review: 'Worth every penny. Top-notch service.' }
            ],
            is_available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            room_id: '3',
            title: 'Economy Comfort Den',
            subtitle: 'Budget-Friendly Comfort 🏠',
            description: 'An affordable option that doesn\'t compromise on care. Perfect for budget-conscious pet parents.',
            dogsAmount: 3,
            price: 25,
            size: '25m²',
            image: `${imageBaseUrl}room-3.png`,
            included: ['Shared play area', 'Basic bedding', 'Daily walks'],
            reviews: [
                { name: 'Lisa', stars: 4, review: 'Great value for money. My dogs were happy.' },
                { name: 'Tom', stars: 4, review: 'Clean and safe, good for multiple dogs.' }
            ],
            is_available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            room_id: '4',
            title: 'The Presidential Paw Suite',
            subtitle: 'Ultimate Luxury Experience ⭐',
            description: 'The ultimate in luxury pet boarding. Spacious suite with private garden access and 24/7 personalized attention.',
            dogsAmount: 1,
            price: 120,
            size: '80m²',
            image: `${imageBaseUrl}room-4.png`,
            included: ['Private garden', 'Premium bedding', '24/7 care', 'Gourmet meals', 'Spa services', 'Live webcam'],
            reviews: [
                { name: 'Emma', stars: 5, review: 'The best boarding experience ever! Highly recommend.' },
                { name: 'John', stars: 5, review: 'My dog came back more relaxed than when he left!' }
            ],
            is_available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            room_id: '5',
            title: 'Family Pack Lodge',
            subtitle: 'Perfect for Pack Adventures 🐕‍🦺',
            description: 'Perfect for families with multiple dogs. Spacious room designed for comfort and socialization.',
            dogsAmount: 4,
            price: 55,
            size: '60m²',
            image: `${imageBaseUrl}room-5.png`,
            included: ['Large play area', 'Multiple beds', 'Group activities', 'Extended playtime'],
            reviews: [
                { name: 'Anna', stars: 5, review: 'Perfect for my three dogs! They loved playing together.' },
                { name: 'Robert', stars: 4, review: 'Great space for multiple pets. Well organized.' }
            ],
            is_available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    let successCount = 0;
    for (const room of sampleRooms) {
        try {
            await docClient.send(new PutCommand({
                TableName: ROOMS_TABLE,
                Item: room
            }));
            successCount++;
            console.log(`Created room: ${room.title}`);
        } catch (error) {
            console.error(`Error creating room ${room.title}:`, error);
        }
    }

    return { success: successCount, total: sampleRooms.length };
}

async function createRoomsFromData(roomsData) {
    console.log('Creating rooms from provided data...');
    
    let successCount = 0;
    for (const room of roomsData) {
        try {
            // Convert the room data to DynamoDB format
            const roomItem = {
                room_id: room.id || uuidv4(),
                title: room.title,
                subtitle: room.subtitle,
                description: room.description,
                dogsAmount: room.dogsAmount,
                price: room.price,
                size: room.size,
                image: room.image,
                included: room.included || [],
                reviews: room.reviews || [],
                is_available: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docClient.send(new PutCommand({
                TableName: ROOMS_TABLE,
                Item: roomItem
            }));
            
            successCount++;
            console.log(`Created room: ${room.title}`);
        } catch (error) {
            console.error(`Error creating room ${room.title}:`, error);
        }
    }

    return { success: successCount, total: roomsData.length };
}

async function createAdminGroup() {
    try {
        const groupName = 'Admins';
        const groupDescription = 'Dogotel Administrators Group';

        // Create admin group in Cognito
        try {
            await cognitoClient.send(new CreateGroupCommand({
                UserPoolId: USER_POOL_ID,
                GroupName: groupName,
                Description: groupDescription,
                Precedence: 1 // Higher precedence for admin group
            }));

            console.log(`Created Cognito admin group: ${groupName}`);
        } catch (error) {
            if (error.name === 'GroupExistsException') {
                console.log(`Admin group ${groupName} already exists in Cognito`);
            } else {
                throw error;
            }
        }

        return { success: 1, total: 1 };
    } catch (error) {
        console.error('Error creating admin group:', error);
        return { success: 0, total: 1 };
    }
}

async function createAdminUser() {
    try {
        const adminEmail = 'admin@dogotel.com';
        const tempPassword = 'TempPass123!';
        const permanentPassword = 'AdminPass123!';
        const adminGroupName = 'Admins';

        // Create user in Cognito
        try {
            await cognitoClient.send(new AdminCreateUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: adminEmail,
                UserAttributes: [
                    { Name: 'email', Value: adminEmail },
                    { Name: 'custom:role', Value: 'ADMIN' },
                    { Name: 'email_verified', Value: 'true' }
                ],
                TemporaryPassword: tempPassword,
                MessageAction: 'SUPPRESS'
            }));

            // Set permanent password
            await cognitoClient.send(new AdminSetUserPasswordCommand({
                UserPoolId: USER_POOL_ID,
                Username: adminEmail,
                Password: permanentPassword,
                Permanent: true
            }));

            // Add user to admin group
            await cognitoClient.send(new AdminAddUserToGroupCommand({
                UserPoolId: USER_POOL_ID,
                Username: adminEmail,
                GroupName: adminGroupName
            }));

            console.log(`Created Cognito admin user: ${adminEmail} and added to group: ${adminGroupName}`);
        } catch (error) {
            if (error.name === 'UsernameExistsException') {
                console.log(`Admin user ${adminEmail} already exists in Cognito`);
                
                // Try to add to group even if user exists
                try {
                    await cognitoClient.send(new AdminAddUserToGroupCommand({
                        UserPoolId: USER_POOL_ID,
                        Username: adminEmail,
                        GroupName: adminGroupName
                    }));
                    console.log(`Added existing admin user to group: ${adminGroupName}`);
                } catch (groupError) {
                    if (groupError.name !== 'UserAlreadyInGroupException') {
                        console.error('Error adding user to admin group:', groupError);
                    }
                }
            } else {
                throw error;
            }
        }

        // Create user record in DynamoDB
        const adminUser = {
            user_id: adminEmail,
            email: adminEmail,
            first_name: 'Admin',
            last_name: 'User',
            phone: '+1-555-0123',
            role: 'ADMIN',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
        };

        await docClient.send(new PutCommand({
            TableName: USERS_TABLE,
            Item: adminUser
        }));

        console.log(`Created DynamoDB admin user record: ${adminEmail}`);

        return { success: 1, total: 1 };
    } catch (error) {
        console.error('Error creating admin user:', error);
        return { success: 0, total: 1 };
    }
}

async function createSampleDining() {
    const sampleDining = [
        {
            dining_id: '1',
            title: 'Breakfast',
            description: 'Nutritious morning meal for your dog',
            price: 15,
            image: 'dog-breakfast.jpg',
            available: true
        },
        {
            dining_id: '2',
            title: 'Dinner',
            description: 'Hearty evening meal with premium ingredients',
            price: 20,
            image: 'dog-dinner.jpg',
            available: true
        },
        {
            dining_id: '3',
            title: 'Custom Meal',
            description: 'Specially prepared meal according to your dog\'s dietary needs',
            price: 25,
            image: 'dog-custom-meal.jpg',
            available: true
        }
    ];

    let successCount = 0;
    for (const dining of sampleDining) {
        try {
            await docClient.send(new PutCommand({
                TableName: 'DogotelDining',
                Item: dining
            }));
            successCount++;
            console.log(`Created dining option: ${dining.title}`);
        } catch (error) {
            console.error(`Error creating dining option ${dining.title}:`, error);
        }
    }

    return { success: successCount, total: sampleDining.length };
}

async function createSampleServices() {
    const sampleServices = [
        {
            service_id: '1',
            title: 'Walking',
            description: 'Daily walks in our secure outdoor areas',
            price: 20,
            image: 'walk-service.jpg',
            available: true
        },
        {
            service_id: '2',
            title: 'Grooming',
            description: 'Professional grooming services including bath and brush',
            price: 45,
            image: 'grooming-service.jpg',
            available: true
        },
        {
            service_id: '3',
            title: 'Training',
            description: 'Basic obedience training sessions',
            price: 60,
            image: 'train-service.jpg',
            available: true
        },
        {
            service_id: '4',
            title: 'Skill Development',
            description: 'Advanced training and skill development programs',
            price: 80,
            image: 'skill-service.jpg',
            available: true
        }
    ];

    let successCount = 0;
    for (const service of sampleServices) {
        try {
            await docClient.send(new PutCommand({
                TableName: 'DogotelServices',
                Item: service
            }));
            successCount++;
            console.log(`Created service: ${service.title}`);
        } catch (error) {
            console.error(`Error creating service ${service.title}:`, error);
        }
    }

    return { success: successCount, total: sampleServices.length };
} 