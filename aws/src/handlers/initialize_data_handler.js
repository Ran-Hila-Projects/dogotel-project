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

        // Create admin group in Cognito first
        console.log('Creating admin group...');
        results.adminGroup = await createAdminGroup();
        
        // Wait a bit to ensure group is created
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create admin user and add to group
        console.log('Creating admin user...');
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
    // Try to load room data from prepared file, fallback to default if not available
    let sampleRooms;
    try {
        const fs = require('fs');
        const path = require('path');
        const roomDataPath = path.join(__dirname, 'room_data.json');
        
        if (fs.existsSync(roomDataPath)) {
            const roomDataFile = JSON.parse(fs.readFileSync(roomDataPath, 'utf8'));
            sampleRooms = roomDataFile.rooms.map(room => ({
                room_id: room.id,
                title: room.title,
                subtitle: room.subtitle,
                description: room.description,
                dogsAmount: room.dogsAmount,
                price: room.price,
                size: room.size,
                image: room.image,
                included: room.included,
                reviews: room.reviews,
                is_available: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            console.log('✅ Using prepared room data from room_data.json');
        } else {
            console.log('⚠️ room_data.json not found, using fallback data');
            throw new Error('Room data file not found');
        }
    } catch (error) {
        console.log('⚠️ Could not load prepared room data, using fallback:', error.message);
        
        // Fallback to default room data
        const imageBaseUrl = IMAGES_BUCKET ? `https://${IMAGES_BUCKET}.s3.amazonaws.com/images/rooms/` : '';
        
        sampleRooms = [
            {
                room_id: '1',
                title: 'The Cozy Kennel',
                subtitle: 'Perfect for Solo Nappers 💤',
                description: 'A quiet, comfy room perfect for solo travelers. Includes a cozy bed, chew toys, and a snuggly blanket. Tail-wagging guaranteed.',
                dogsAmount: 1,
                price: 55,
                size: '30m²',
                image: `${imageBaseUrl}room-1.jpg`,
                included: ['Daily housekeeping (we pick up the poop 💩', 'Soft orthopedic bed', 'Water & food bowls (refilled daily!)', 'Chew toys & squeaky duck for late-night conversations', 'Fresh air window view', 'Private potty area'],
                reviews: [
                    { name: 'Hila Tsivion', stars: 5, review: 'Amazing experience! My dog loved it!' },
                    { name: 'Ran Meshulam', stars: 4, review: 'Great care, cozy room. Would book again!' },
                    { name: 'Adi Cohen', stars: 5, review: 'They treated my pup like royalty.' }
                ],
                is_available: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                room_id: '2',
                title: 'Deluxe Duo Den',
                subtitle: 'For Active Explorers 🐕‍🦺',
                description: 'Spacious and luxurious suite for two dogs. Great for siblings or best friends. Comes with two beds and extra treats.',
                dogsAmount: 2,
                price: 80,
                size: '50m²',
                image: `${imageBaseUrl}room-2.png`,
                included: ['Private play area', 'Water fountain for hydration', 'Daily playtime with staff', 'Sunlit windows', 'Memory foam beds'],
                reviews: [
                    { name: 'Maya Levi', stars: 5, review: 'My dog loved the play area!' },
                    { name: 'Nadav Ben Ami', stars: 5, review: 'Perfect for active dogs, lots of space.' }
                ],
                is_available: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                room_id: '3',
                title: 'Garden Sniff Suite',
                subtitle: 'For Curious Noses 🌿',
                description: 'A sunny room with direct access to our sniff-friendly garden. Ideal for active pups who love fresh grass and fresh air.',
                dogsAmount: 1,
                price: 65,
                size: '35m²',
                image: `${imageBaseUrl}room-3.png`,
                included: ['Fresh air window view', 'Private potty area', 'Access to garden sniff zone', 'Chew toys & squeaky duck for late-night conversations', 'Water & food bowls (refilled daily!)', 'Daily housekeeping (we pick up the poop 💩'],
                reviews: [
                    { name: 'Lior Peleg', stars: 5, review: 'Our pup had the best time sniffing around the garden. Loved it!' },
                    { name: 'Dana Sela', stars: 4, review: 'Great room for active dogs. Beautiful sun all day.' }
                ],
                is_available: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                room_id: '4',
                title: 'Spa Paws Retreat',
                subtitle: 'For Pampered Pooches 💆‍♂️',
                description: 'A calm, luxury suite for pampered pups. Includes spa-scented bedding and daily relaxation music.',
                dogsAmount: 1,
                price: 90,
                size: '40m²',
                image: `${imageBaseUrl}room-4.png`,
                included: ['Soft orthopedic bed', 'Blanket-snuggle service on request', 'Daily relaxation music', 'Spa-scented bedding', 'Private potty area', 'Water & food bowls (refilled daily!)'],
                reviews: [
                    { name: 'Tamar Avrahami', stars: 5, review: 'My dog came back more relaxed than I am after a spa day 😂' },
                    { name: 'Noam Geffen', stars: 5, review: 'They really know how to pamper pets here!' }
                ],
                is_available: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                room_id: '5',
                title: 'Family Fur Cabin',
                subtitle: 'Perfect for Pupper Parties 🐾🎉',
                description: 'Perfect for 3 furry siblings – or a party! A wide room with space to run, jump and nap together.',
                dogsAmount: 3,
                price: 100,
                size: '60m²',
                image: `${imageBaseUrl}room-5.png`,
                included: ['Three soft orthopedic beds', 'Large private play area', 'Daily housekeeping (we pick up the poop 💩', 'Water & food bowls (refilled daily!)', 'Chew toys & squeaky duck for late-night conversations', 'Fresh air window view'],
                reviews: [
                    { name: 'Yael Bar-On', stars: 5, review: 'Perfect for our 3 crazy pups! They had so much room to play.' },
                    { name: 'Amit Tal', stars: 4, review: 'Spacious and fun. Our dogs came home tired and happy!' }
                ],
                is_available: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

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
        const groupName = 'admin';
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
        const adminGroupName = 'admin';

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