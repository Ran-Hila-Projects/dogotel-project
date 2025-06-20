const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { corsResponse, corsErrorResponse, handlePreflightRequest, extractOriginFromEvent, isAdmin } = require('./cors_utils');

// Initialize AWS clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({});

// Environment variables
const ROOMS_TABLE = process.env.DYNAMODB_TABLE_ROOMS || 'DogotelRooms';
const BOOKINGS_TABLE = process.env.DYNAMODB_TABLE_BOOKINGS || 'DogotelBookings';
const S3_BUCKET = process.env.S3_BUCKET || 'dogotel-images';

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

        if (path === '/rooms' && httpMethod === 'GET') {
            return await handleListRooms(event);
        } else if (path.startsWith('/rooms/') && path.split('/').length === 3 && httpMethod === 'GET') {
            const roomId = path.split('/')[2];
            return await handleGetRoom(roomId, event);
        } else if (path.startsWith('/rooms/') && path.endsWith('/unavailable-dates') && httpMethod === 'GET') {
            const roomId = path.split('/')[2];
            return await handleGetUnavailableDates(roomId, event);
        } else if (path.startsWith('/rooms/') && path.endsWith('/unavailable-ranges') && httpMethod === 'GET') {
            const roomId = path.split('/')[2];
            return await handleGetUnavailableRanges(roomId, event);
        } else if (path.startsWith('/rooms/') && path.endsWith('/reviews') && httpMethod === 'POST') {
            const roomId = path.split('/')[2];
            return await handleAddReview(roomId, event);
        } else if (path.startsWith('/rooms/') && path.endsWith('/reviews') && httpMethod === 'GET') {
            const roomId = path.split('/')[2];
            return await handleGetReviews(roomId, event);
        } else if (path === '/rooms' && httpMethod === 'POST') {
            return await handleCreateRoom(event);
        } else if (path.startsWith('/rooms/') && path.split('/').length === 3 && httpMethod === 'PUT') {
            const roomId = path.split('/')[2];
            return await handleUpdateRoom(roomId, event);
        } else if (path.startsWith('/rooms/') && path.split('/').length === 3 && httpMethod === 'DELETE') {
            const roomId = path.split('/')[2];
            return await handleDeleteRoom(roomId, event);
        } else {
            return corsErrorResponse(404, 'Endpoint not found', origin);
        }
    } catch (error) {
        console.error('Error in rooms handler:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
};

async function handleListRooms(event) {
    try {
        const origin = extractOriginFromEvent(event);
        const queryParams = event.queryStringParameters || {};
        const { min_price, max_price, check_in, check_out, size } = queryParams;

        // Get all rooms
        const result = await docClient.send(new ScanCommand({
            TableName: ROOMS_TABLE
        }));

        let rooms = result.Items || [];

        // Apply filters
        const filteredRooms = [];
        for (const room of rooms) {
            // Price filter
            const roomPrice = room.price || room.price_per_night || 0;
            if (min_price && roomPrice < parseFloat(min_price)) continue;
            if (max_price && roomPrice > parseFloat(max_price)) continue;

            // Size filter
            if (size && room.size?.toLowerCase() !== size.toLowerCase()) continue;

            // Availability filter
            if (check_in && check_out) {
                const available = await isRoomAvailable(room.room_id, check_in, check_out);
                if (!available) continue;
            }

            // Transform room for frontend
            const transformedRoom = transformRoomForFrontend(room);
            filteredRooms.push(transformedRoom);
        }

        return corsResponse(200, filteredRooms, origin);
    } catch (error) {
        console.error('List rooms error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleGetRoom(roomId, event) {
    try {
        const origin = extractOriginFromEvent(event);

        const result = await docClient.send(new GetCommand({
            TableName: ROOMS_TABLE,
            Key: { room_id: roomId }
        }));

        if (!result.Item) {
            return corsErrorResponse(404, 'Room not found', origin);
        }

        const room = transformRoomForFrontend(result.Item);
        return corsResponse(200, room, origin);
    } catch (error) {
        console.error('Get room error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleGetUnavailableDates(roomId, event) {
    try {
        const origin = extractOriginFromEvent(event);

        // Get all confirmed bookings for this room
        const result = await docClient.send(new QueryCommand({
            TableName: BOOKINGS_TABLE,
            IndexName: 'RoomBookingsIndex',
            KeyConditionExpression: 'room_id = :room_id',
            FilterExpression: '#status IN (:confirmed, :checked_in)',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':room_id': roomId,
                ':confirmed': 'confirmed',
                ':checked_in': 'checked_in'
            }
        }));

        const unavailableDates = [];
        for (const booking of result.Items || []) {
            // Handle both old and new date formats
            const bookingCheckIn = new Date(
                booking.check_in || booking.room?.startDate || booking.startDate
            );
            const bookingCheckOut = new Date(
                booking.check_out || booking.room?.endDate || booking.endDate
            );

            if (isNaN(bookingCheckIn.getTime()) || isNaN(bookingCheckOut.getTime())) {
                console.log('Invalid dates in booking:', booking);
                continue;
            }

            let currentDate = new Date(bookingCheckIn);
            const endDate = new Date(bookingCheckOut);

            while (currentDate < endDate) {
                unavailableDates.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return corsResponse(200, {
            roomId: roomId,
            unavailableDates: [...new Set(unavailableDates)].sort()
        }, origin);
    } catch (error) {
        console.error('Get unavailable dates error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleGetUnavailableRanges(roomId, event) {
    try {
        const origin = extractOriginFromEvent(event);

        // Get all confirmed bookings for this room
        const result = await docClient.send(new QueryCommand({
            TableName: BOOKINGS_TABLE,
            IndexName: 'RoomBookingsIndex',
            KeyConditionExpression: 'room_id = :room_id',
            FilterExpression: '#status IN (:confirmed, :checked_in)',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':room_id': roomId,
                ':confirmed': 'confirmed',
                ':checked_in': 'checked_in'
            }
        }));

        const unavailableRanges = [];
        for (const booking of result.Items || []) {
            // Handle both old and new date formats
            const bookingCheckIn = new Date(
                booking.check_in || booking.room?.startDate || booking.startDate
            );
            const bookingCheckOut = new Date(
                booking.check_out || booking.room?.endDate || booking.endDate
            );

            if (isNaN(bookingCheckIn.getTime()) || isNaN(bookingCheckOut.getTime())) {
                console.log('Invalid dates in booking:', booking);
                continue;
            }

            // Adjust checkout date (booking ends day before checkout)
            const actualEndDate = new Date(bookingCheckOut);
            actualEndDate.setDate(actualEndDate.getDate() - 1);

            unavailableRanges.push({
                start: bookingCheckIn.toISOString().split('T')[0],
                end: actualEndDate.toISOString().split('T')[0]
            });
        }

        return corsResponse(200, {
            roomId: roomId,
            unavailableRanges: unavailableRanges
        }, origin);
    } catch (error) {
        console.error('Get unavailable ranges error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleCreateRoom(event) {
    try {
        const origin = extractOriginFromEvent(event);

        if (!isAdmin(event)) {
            return corsErrorResponse(403, 'Admin access required', origin);
        }

        const body = JSON.parse(event.body);
        const roomId = uuidv4();

        const room = {
            room_id: roomId,
            title: body.title,
            subtitle: body.subtitle,
            description: body.description,
            dogsAmount: body.dogsAmount,
            price: body.price,
            size: body.size,
            image: body.image,
            included: body.included || [],
            reviews: body.reviews || [],
            is_available: body.is_available !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
            TableName: ROOMS_TABLE,
            Item: room
        }));

        return corsResponse(201, {
            success: true,
            roomId: roomId,
            message: 'Room created successfully'
        }, origin);
    } catch (error) {
        console.error('Create room error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleUpdateRoom(roomId, event) {
    try {
        const origin = extractOriginFromEvent(event);

        if (!isAdmin(event)) {
            return corsErrorResponse(403, 'Admin access required', origin);
        }

        const body = JSON.parse(event.body);

        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        Object.entries(body).forEach(([key, value]) => {
            if (key !== 'room_id') {
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = value;
            }
        });

        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
        updateExpression.push('#updatedAt = :updatedAt');

        await docClient.send(new UpdateCommand({
            TableName: ROOMS_TABLE,
            Key: { room_id: roomId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }));

        return corsResponse(200, {
            success: true,
            message: 'Room updated successfully'
        }, origin);
    } catch (error) {
        console.error('Update room error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleDeleteRoom(roomId, event) {
    try {
        const origin = extractOriginFromEvent(event);

        if (!isAdmin(event)) {
            return corsErrorResponse(403, 'Admin access required', origin);
        }

        await docClient.send(new DeleteCommand({
            TableName: ROOMS_TABLE,
            Key: { room_id: roomId }
        }));

        return corsResponse(200, {
            success: true,
            message: 'Room deleted successfully'
        }, origin);
    } catch (error) {
        console.error('Delete room error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function isRoomAvailable(roomId, checkIn, checkOut) {
    try {
        const result = await docClient.send(new QueryCommand({
            TableName: BOOKINGS_TABLE,
            IndexName: 'RoomBookingsIndex',
            KeyConditionExpression: 'room_id = :room_id',
            FilterExpression: '#status IN (:confirmed, :checked_in)',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':room_id': roomId,
                ':confirmed': 'confirmed',
                ':checked_in': 'checked_in'
            }
        }));

        const requestCheckIn = new Date(checkIn);
        const requestCheckOut = new Date(checkOut);

        for (const booking of result.Items || []) {
            // Handle both old and new date formats
            const bookingCheckIn = new Date(
                booking.check_in || booking.room?.startDate || booking.startDate
            );
            const bookingCheckOut = new Date(
                booking.check_out || booking.room?.endDate || booking.endDate
            );

            if (isNaN(bookingCheckIn.getTime()) || isNaN(bookingCheckOut.getTime())) {
                console.log('Invalid dates in booking:', booking);
                continue;
            }

            // Check for overlap
            if (requestCheckIn < bookingCheckOut && requestCheckOut > bookingCheckIn) {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Room availability check error:', error);
        return false;
    }
}

function transformRoomForFrontend(room) {
    return {
        id: room.room_id,
        title: room.title,
        subtitle: room.subtitle,
        description: room.description,
        dogsAmount: room.dogsAmount,
        price: room.price,
        size: room.size,
        image: room.image,
        included: room.included || [],
        reviews: room.reviews || [],
        isAvailable: room.is_available !== false
    };
}

async function handleAddReview(roomId, event) {
    try {
        const origin = extractOriginFromEvent(event);
        const body = JSON.parse(event.body);
        const { email, stars, text } = body;

        if (!email || !stars || !text) {
            return corsErrorResponse(400, 'Missing required fields: email, stars, text', origin);
        }

        if (stars < 1 || stars > 5) {
            return corsErrorResponse(400, 'Stars must be between 1 and 5', origin);
        }

        // Check if room exists
        const roomResult = await docClient.send(new GetCommand({
            TableName: ROOMS_TABLE,
            Key: { room_id: roomId }
        }));

        if (!roomResult.Item) {
            return corsErrorResponse(404, 'Room not found', origin);
        }

        // Create new review
        const newReview = {
            name: email.split('@')[0], // Use email prefix as name
            email: email,
            stars: parseInt(stars),
            review: text,
            date: new Date().toISOString(),
            reviewId: uuidv4()
        };

        // Get current reviews and add new one
        const currentReviews = roomResult.Item.reviews || [];
        
        // Check if user already reviewed this room
        const existingReviewIndex = currentReviews.findIndex(r => r.email === email);
        if (existingReviewIndex !== -1) {
            // Update existing review
            currentReviews[existingReviewIndex] = newReview;
        } else {
            // Add new review
            currentReviews.push(newReview);
        }

        // Update room with new reviews
        await docClient.send(new UpdateCommand({
            TableName: ROOMS_TABLE,
            Key: { room_id: roomId },
            UpdateExpression: 'SET reviews = :reviews, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':reviews': currentReviews,
                ':updatedAt': new Date().toISOString()
            }
        }));

        return corsResponse(201, {
            success: true,
            message: existingReviewIndex !== -1 ? 'Review updated successfully' : 'Review added successfully',
            review: newReview
        }, origin);

    } catch (error) {
        console.error('Add review error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}

async function handleGetReviews(roomId, event) {
    try {
        const origin = extractOriginFromEvent(event);

        // Get room with reviews
        const result = await docClient.send(new GetCommand({
            TableName: ROOMS_TABLE,
            Key: { room_id: roomId }
        }));

        if (!result.Item) {
            return corsErrorResponse(404, 'Room not found', origin);
        }

        const reviews = result.Item.reviews || [];

        return corsResponse(200, {
            success: true,
            roomId: roomId,
            reviews: reviews,
            reviewCount: reviews.length,
            averageRating: reviews.length > 0 
                ? (reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)
                : 0
        }, origin);

    } catch (error) {
        console.error('Get reviews error:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
}