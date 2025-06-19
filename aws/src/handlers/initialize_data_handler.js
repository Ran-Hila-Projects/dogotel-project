const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
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

        console.log('Starting data initialization...');

        const results = {
            rooms: { success: 0, total: 0 },
            users: { success: 0, total: 0 },
            dining: { success: 0, total: 0 },
            services: { success: 0, total: 0 }
        };

        // Create sample rooms
        const roomResults = await createSampleRooms();
        results.rooms = roomResults;

        // Create admin user
        const userResults = await createAdminUser();
        results.users = userResults;

        // Create sample dining options
        const diningResults = await createSampleDining();
        results.dining = diningResults;

        // Create sample services
        const servicesResults = await createSampleServices();
        results.services = servicesResults;

        console.log('Data initialization completed:', results);

        return corsResponse(200, {
            success: true,
            message: 'Data initialization completed successfully',
            results: results
        }, origin);
    } catch (error) {
        console.error('Initialize data error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function createSampleRooms() {
    const sampleRooms = [
        {
            room_id: '1',
            title: 'The Cozy Kennel',
            subtitle: 'Perfect for Solo Nappers 💤',
            description: 'A comfortable and intimate space designed for your dog\'s relaxation and peace. Features premium bedding, climate control, and daily housekeeping.',
            dogsAmount: 1,
            price: 55,
            size: '30m²',
            image: 'https://example.com/room1.jpg',
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
            image: 'https://example.com/room2.jpg',
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
            image: 'https://example.com/room3.jpg',
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
            image: 'https://example.com/room4.jpg',
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
            image: 'https://example.com/room5.jpg',
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

async function createAdminUser() {
    try {
        const adminEmail = 'admin@dogotel.com';
        const tempPassword = 'TempPass123!';
        const permanentPassword = 'AdminPass123!';

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

            console.log(`Created Cognito admin user: ${adminEmail}`);
        } catch (error) {
            if (error.name === 'UsernameExistsException') {
                console.log(`Admin user ${adminEmail} already exists in Cognito`);
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