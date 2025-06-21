const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

// Initialize AWS clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({});
const sqsClient = new SQSClient({});

// Environment variables
const ROOMS_TABLE = process.env.ROOMS_TABLE || "DogotelRooms";
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE || "DogotelBookings";
const DAILY_ROOMS_TOPIC_ARN = process.env.DAILY_ROOMS_TOPIC_ARN;
const DAILY_ROOMS_QUEUE_URL = process.env.DAILY_ROOMS_QUEUE_URL;

exports.handler = async (event, context) => {
  console.log("Daily rooms notification triggered:", JSON.stringify(event, null, 2));

  try {
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`Processing daily room availability for: ${todayStr}`);

    // Get all available rooms for today
    const availableRooms = await getAvailableRoomsForDate(todayStr);
    
    if (availableRooms.length === 0) {
      console.log("No available rooms found for today");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No available rooms for today" })
      };
    }

    // Format the email content
    const emailContent = formatDailyRoomsEmail(availableRooms, todayStr);
    
    // Send to SNS topic
    await sendDailyRoomsNotification(emailContent, todayStr);
    
    // Also send to SQS for processing
    await sendToSQS({
      eventType: "DAILY_ROOMS_NOTIFICATION",
      date: todayStr,
      availableRoomsCount: availableRooms.length,
      timestamp: new Date().toISOString()
    });

    console.log(`Daily rooms notification sent successfully for ${availableRooms.length} rooms`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Daily notification sent for ${availableRooms.length} available rooms`,
        date: todayStr
      })
    };

  } catch (error) {
    console.error("Error in daily rooms handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

async function getAvailableRoomsForDate(dateStr) {
  try {
    // Get all rooms
    const roomsResult = await docClient.send(
      new ScanCommand({
        TableName: ROOMS_TABLE,
        FilterExpression: "is_available = :available",
        ExpressionAttributeValues: {
          ":available": true
        }
      })
    );

    const allRooms = roomsResult.Items || [];
    const availableRooms = [];

    // Check each room's availability for today
    for (const room of allRooms) {
      const isAvailable = await isRoomAvailableForDate(room.room_id, dateStr);
      if (isAvailable) {
        availableRooms.push(room);
      }
    }

    return availableRooms;
  } catch (error) {
    console.error("Error getting available rooms:", error);
    return [];
  }
}

async function isRoomAvailableForDate(roomId, dateStr) {
  try {
    // Query bookings for this room
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

    const requestDate = new Date(dateStr);

    // Check if any booking conflicts with today
    for (const booking of result.Items || []) {
      const bookingCheckIn = new Date(
        booking.check_in || booking.room?.startDate || booking.startDate
      );
      const bookingCheckOut = new Date(
        booking.check_out || booking.room?.endDate || booking.endDate
      );

      if (isNaN(bookingCheckIn.getTime()) || isNaN(bookingCheckOut.getTime())) {
        continue;
      }

      // Check if today falls within any booking period
      if (requestDate >= bookingCheckIn && requestDate < bookingCheckOut) {
        return false; // Room is booked for this date
      }
    }

    return true; // Room is available
  } catch (error) {
    console.error(`Error checking availability for room ${roomId}:`, error);
    return false;
  }
}

function formatDailyRoomsEmail(rooms, dateStr) {
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let emailContent = `
🏨 Daily Room Availability - ${formattedDate} 🏨

Good morning! Here are the available rooms for today:

`;

  rooms.forEach((room, index) => {
    emailContent += `
🐕 Room ${index + 1}: ${room.title || 'Unnamed Room'}
   • Type: ${room.subtitle || 'Standard Room'}
   • Capacity: ${room.dogsAmount || 1} dog${room.dogsAmount > 1 ? 's' : ''}
   • Price: $${room.price || 0}/night
   • Size: ${room.size || 'Standard'}
   • Description: ${room.description || 'Comfortable accommodation for your furry friend'}

`;
  });

  emailContent += `
📞 Ready to book? Visit our website or contact us directly!

🌟 Special Features:
• 24/7 supervision and care
• Daily walks and playtime  
• Comfortable bedding and feeding
• Professional staff

Thank you for choosing Dogotel for your pet's comfort and happiness!

Best regards,
The Dogotel Team

---
You're receiving this because you subscribed to daily room availability updates.
`;

  return emailContent;
}

async function sendDailyRoomsNotification(emailContent, dateStr) {
  if (!DAILY_ROOMS_TOPIC_ARN) {
    console.log("Daily rooms topic ARN not configured");
    return;
  }

  try {
    await snsClient.send(
      new PublishCommand({
        TopicArn: DAILY_ROOMS_TOPIC_ARN,
        Message: emailContent,
        Subject: `🏨 Daily Room Availability - ${new Date(dateStr).toLocaleDateString()}`,
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "DAILY_ROOMS",
          },
          date: {
            DataType: "String",
            StringValue: dateStr,
          },
        },
      })
    );

    console.log("Daily rooms notification sent to SNS successfully");
  } catch (error) {
    console.error("Failed to send daily rooms notification:", error);
    throw error;
  }
}

async function sendToSQS(message) {
  if (!DAILY_ROOMS_QUEUE_URL) {
    console.log("Daily rooms queue URL not configured");
    return;
  }

  try {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: DAILY_ROOMS_QUEUE_URL,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "DAILY_ROOMS_NOTIFICATION",
          },
        },
      })
    );

    console.log("Daily rooms event sent to SQS successfully");
  } catch (error) {
    console.error("Failed to send daily rooms event to SQS:", error);
    // Don't throw error - SQS is optional
  }
} 