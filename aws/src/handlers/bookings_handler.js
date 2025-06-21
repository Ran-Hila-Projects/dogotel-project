const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { v4: uuidv4 } = require("uuid");
const {
  corsResponse,
  corsErrorResponse,
  handlePreflightRequest,
  extractOriginFromEvent,
  isAdmin,
} = require("./cors_utils");

// Initialize AWS clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const sqsClient = new SQSClient({});
const snsClient = new SNSClient({});

// Environment variables
const BOOKINGS_TABLE = process.env.DYNAMODB_TABLE_BOOKINGS || "DogotelBookings";
const ROOMS_TABLE = process.env.DYNAMODB_TABLE_ROOMS || "DogotelRooms";
const BOOKING_EVENTS_QUEUE_URL = process.env.BOOKING_EVENTS_QUEUE_URL;
const ADMIN_NOTIFICATIONS_TOPIC_ARN = process.env.ADMIN_NOTIFICATIONS_TOPIC_ARN;
const USER_NOTIFICATIONS_TOPIC_ARN = process.env.USER_NOTIFICATIONS_TOPIC_ARN;

exports.handler = async (event, context) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    const httpMethod = event.httpMethod;
    const path = event.path;
    const origin = extractOriginFromEvent(event);

    console.log(`Processing ${httpMethod} ${path} from origin: ${origin}`);

    // Handle preflight OPTIONS requests
    if (httpMethod === "OPTIONS") {
      return handlePreflightRequest(event, origin);
    }

    if (path === "/bookings" && httpMethod === "POST") {
      return await handleCreateBooking(event);
    } else if (path === "/bookings" && httpMethod === "GET") {
      const queryParams = event.queryStringParameters || {};
      if (queryParams.userId) {
        return await handleGetUserBookingsByUserId(event);
      } else {
        return await handleGetAllBookings(event);
      }
    } else if (path.startsWith("/bookings/") && httpMethod === "GET") {
      // Handle GET /bookings/:email for booking history
      const email = path.split("/bookings/")[1];
      return await handleGetBookingHistory(event, email);
    } else {
      return corsErrorResponse(404, "Endpoint not found", origin);
    }
  } catch (error) {
    console.error("Error in bookings handler:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
};

async function handleCreateBooking(event) {
  try {
    const origin = extractOriginFromEvent(event);
    const body = JSON.parse(event.body);

    // Frontend cart format validation
    const { userEmail, room, dining, services, totalPrice } = body;
    const { roomId, startDate, endDate, dogs, roomTitle, pricePerNight } =
      room || {};

    // Validate required fields
    if (!userEmail) {
      return corsErrorResponse(400, "userEmail is required", origin);
    }
    if (!roomId) {
      return corsErrorResponse(400, "room.roomId is required", origin);
    }
    if (!startDate) {
      return corsErrorResponse(400, "room.startDate is required", origin);
    }
    if (!endDate) {
      return corsErrorResponse(400, "room.endDate is required", origin);
    }
    if (!dogs || dogs.length === 0) {
      return corsErrorResponse(400, "room.dogs is required", origin);
    }

    // Validate dates
    const checkInDate = new Date(startDate.replace("Z", ""));
    const checkOutDate = new Date(endDate.replace("Z", ""));

    if (checkInDate >= checkOutDate) {
      return corsErrorResponse(400, "Check-out must be after check-in", origin);
    }

    if (checkInDate < new Date()) {
      return corsErrorResponse(
        400,
        "Check-in date cannot be in the past",
        origin
      );
    }

    // Check if room exists and is available
    const roomResult = await docClient.send(
      new GetCommand({
        TableName: ROOMS_TABLE,
        Key: { room_id: roomId },
      })
    );

    if (!roomResult.Item) {
      return corsErrorResponse(404, "Room not found", origin);
    }

    const roomData = roomResult.Item;

    if (!roomData.is_available) {
      return corsErrorResponse(400, "Room is not available", origin);
    }

    const guestCount = dogs.length;
    if (guestCount > roomData.dogsAmount) {
      return corsErrorResponse(400, "Dog count exceeds room capacity", origin);
    }

    // Check availability for the dates
    const available = await isRoomAvailable(roomId, startDate, endDate);
    if (!available) {
      return corsErrorResponse(
        400,
        "Room is not available for selected dates",
        origin
      );
    }

    // Create booking with exact cart format
    const bookingId = uuidv4();
    const bookingData = {
      bookingId: bookingId,
      userEmail: userEmail,
      room_id: roomId, // Add for index queries
      room: room,
      dining: dining,
      services: services,
      totalPrice: totalPrice,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: BOOKINGS_TABLE,
        Item: bookingData,
      })
    );

    // Send booking event to SQS for processing
    try {
      await sendBookingEventToSqs(bookingData, roomData, userEmail, "User");
    } catch (sqsError) {
      console.error("SQS message sending failed:", sqsError);
      // Don't fail the booking if SQS fails
    }

    // Send SNS notifications (admin and user)
    try {
      await sendBookingNotifications(bookingData, roomData);
    } catch (snsError) {
      console.error("SNS notification sending failed:", snsError);
      // Don't fail the booking if SNS fails
    }

    return corsResponse(
      201,
      {
        success: true,
        bookingId: bookingId,
        message: "Booking created successfully",
      },
      origin
    );
  } catch (error) {
    console.error("Create booking error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleGetUserBookingsByUserId(event) {
  try {
    const origin = extractOriginFromEvent(event);
    const queryParams = event.queryStringParameters || {};
    const userId = queryParams.userId;

    if (!userId) {
      return corsErrorResponse(400, "userId parameter is required", origin);
    }

    // Query bookings by userEmail
    const result = await docClient.send(
      new QueryCommand({
        TableName: BOOKINGS_TABLE,
        IndexName: "UserBookingsIndex",
        KeyConditionExpression: "userEmail = :userEmail",
        ExpressionAttributeValues: { ":userEmail": userId },
      })
    );

    // Transform to exact format from Ran_dev.txt endpoint 4
    const bookings = [];
    for (const booking of result.Items || []) {
      const roomData = booking.room || {};
      bookings.push({
        bookingId: booking.bookingId,
        roomId: roomData.roomId,
        startDate: roomData.startDate,
        endDate: roomData.endDate,
        dogs: roomData.dogs || [],
      });
    }

    return corsResponse(200, bookings, origin);
  } catch (error) {
    console.error("Get user bookings error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleGetAllBookings(event) {
  try {
    const origin = extractOriginFromEvent(event);

    if (!isAdmin(event)) {
      return corsErrorResponse(403, "Admin access required", origin);
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: BOOKINGS_TABLE,
      })
    );

    const bookings = result.Items || [];

    // Transform for admin view
    const transformedBookings = bookings.map((booking) => {
      const room = booking.room || {};
      const dining = booking.dining || {};
      const services = booking.services || [];

      return {
        bookingId: booking.bookingId,
        user: booking.userEmail,
        room: room.roomTitle || room.title || "Unknown Room",
        dogs: Array.isArray(room.dogs)
          ? room.dogs
              .map((dog) => (typeof dog === "string" ? dog : dog.name))
              .join(", ")
          : "N/A",
        startDate: room.startDate || "N/A",
        endDate: room.endDate || "N/A",
        totalPrice: booking.totalPrice || 0,
        status: booking.status || "unknown",
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        dining: dining.title || "None",
        services: Array.isArray(services)
          ? services
              .map((service) => service.title || service.name || service)
              .join(", ") || "None"
          : "None",
      };
    });

    // Sort by creation date (newest first)
    transformedBookings.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    return corsResponse(
      200,
      {
        success: true,
        bookings: transformedBookings,
      },
      origin
    );
  } catch (error) {
    console.error("Get all bookings error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleGetBookingHistory(event, email) {
  try {
    const origin = extractOriginFromEvent(event);
    const decodedEmail = decodeURIComponent(email);

    if (!decodedEmail) {
      return corsErrorResponse(400, "User email is required", origin);
    }

    console.log(`Fetching booking history for: ${decodedEmail}`);

    // Query bookings by userEmail using the GSI
    const result = await docClient.send(
      new QueryCommand({
        TableName: BOOKINGS_TABLE,
        IndexName: "UserEmailIndex", // Assuming a GSI on userEmail
        KeyConditionExpression: "userEmail = :userEmail",
        ExpressionAttributeValues: { ":userEmail": decodedEmail },
      })
    );

    const history = result.Items || [];

    // Sort by creation date (newest first)
    history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`Found ${history.length} bookings for ${decodedEmail}`);

    return corsResponse(
      200,
      {
        success: true,
        history: history,
      },
      origin
    );
  } catch (error) {
    console.error("Get booking history error:", error);
    // If the index is not found, it could be a specific error
    if (
      error.name === "ValidationException" &&
      error.message.includes("index")
    ) {
      return corsErrorResponse(
        500,
        "Server configuration error: Booking index not found.",
        extractOriginFromEvent(event)
      );
    }
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function isRoomAvailable(roomId, checkIn, checkOut) {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: BOOKINGS_TABLE,
        IndexName: "RoomBookingsIndex",
        KeyConditionExpression: "room_id = :room_id",
        FilterExpression: "#status IN (:confirmed, :checked_in)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":room_id": roomId,
          ":confirmed": "confirmed",
          ":checked_in": "checked_in",
        },
      })
    );

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
        console.log("Invalid dates in booking:", booking);
        continue;
      }

      // Check for overlap
      if (
        requestCheckIn < bookingCheckOut &&
        requestCheckOut > bookingCheckIn
      ) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Room availability check error:", error);
    return false;
  }
}

async function sendBookingEventToSqs(booking, room, userEmail, userName) {
  if (!BOOKING_EVENTS_QUEUE_URL) {
    console.log("SQS queue URL not configured");
    return;
  }

  try {
    const message = {
      eventType: "BOOKING_CREATED",
      bookingId: booking.bookingId,
      userEmail: userEmail,
      userName: userName,
      roomTitle: room.title,
      checkIn: booking.room?.startDate,
      checkOut: booking.room?.endDate,
      totalPrice: booking.totalPrice,
      timestamp: new Date().toISOString(),
    };

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: BOOKING_EVENTS_QUEUE_URL,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "BOOKING_CREATED",
          },
        },
      })
    );

    console.log("Booking event sent to SQS successfully");
  } catch (error) {
    console.error("Failed to send booking event to SQS:", error);
    throw error;
  }
}

async function sendBookingNotifications(bookingData, roomData) {
  console.log("Sending booking notification to subscribed admins...");
  console.log("Admin Topic ARN:", ADMIN_NOTIFICATIONS_TOPIC_ARN);

  // Only send notification to admins - no user emails after booking
  if (ADMIN_NOTIFICATIONS_TOPIC_ARN) {
    console.log("Sending admin notification...");
    const adminMessage = `
🚨 New Booking Alert! 🚨

A new booking has been created:

📋 Booking ID: ${bookingData.bookingId}
👤 User: ${bookingData.userEmail}
🏨 Room: ${roomData.title || bookingData.room?.roomTitle}
📅 Check-in: ${bookingData.room?.startDate}
📅 Check-out: ${bookingData.room?.endDate}
🐕 Dogs: ${Array.isArray(bookingData.room?.dogs) ? bookingData.room.dogs.map(d => d.name || d).join(', ') : 'N/A'}
💰 Total Price: $${bookingData.totalPrice}

Time: ${new Date().toLocaleString()}

Please review the booking in the admin dashboard.
`;

    try {
      await snsClient.send(
        new PublishCommand({
          TopicArn: ADMIN_NOTIFICATIONS_TOPIC_ARN,
          Message: adminMessage,
          Subject: `New Dogotel Booking - ${bookingData.bookingId}`,
          MessageAttributes: {
            eventType: {
              DataType: "String",
              StringValue: "NEW_BOOKING",
            },
            bookingId: {
              DataType: "String",
              StringValue: bookingData.bookingId,
            },
          },
        })
      );
      console.log("Admin notification sent successfully to all subscribed admins");
    } catch (error) {
      console.error("Failed to send admin notification:", error);
    }
  } else {
    console.log("Admin notifications topic ARN not configured");
  }
}
