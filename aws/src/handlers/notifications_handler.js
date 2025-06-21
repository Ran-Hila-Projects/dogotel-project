const { SNSClient, SubscribeCommand, PublishCommand, ListSubscriptionsByTopicCommand, UnsubscribeCommand } = require("@aws-sdk/client-sns");
const {
  corsResponse,
  corsErrorResponse,
  handlePreflightRequest,
  extractOriginFromEvent,
  isAdmin,
} = require("./cors_utils");

// Initialize AWS clients
const snsClient = new SNSClient({});

// Environment variables
const ADMIN_NOTIFICATIONS_TOPIC_ARN = process.env.ADMIN_NOTIFICATIONS_TOPIC_ARN;
const USER_NOTIFICATIONS_TOPIC_ARN = process.env.USER_NOTIFICATIONS_TOPIC_ARN;
const DAILY_ROOMS_TOPIC_ARN = process.env.DAILY_ROOMS_TOPIC_ARN;

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

    if (path === "/notifications/admin/subscribe" && httpMethod === "POST") {
      return await handleAdminSubscribe(event);
    } else if (path === "/notifications/admin/status" && httpMethod === "GET") {
      return await handleAdminSubscriptionStatus(event);
    } else if (path === "/notifications/user/confirm-booking" && httpMethod === "POST") {
      return await handleUserBookingConfirmation(event);
    } else if (path === "/notifications/daily-rooms/subscribe" && httpMethod === "POST") {
      return await handleDailyRoomsSubscribe(event);
    } else if (path === "/notifications/daily-rooms/unsubscribe" && httpMethod === "POST") {
      return await handleDailyRoomsUnsubscribe(event);
    } else if (path === "/notifications/test-admin" && httpMethod === "POST") {
      return await handleTestAdminNotification(event);
    } else {
      return corsErrorResponse(404, "Endpoint not found", origin);
    }
  } catch (error) {
    console.error("Error in notifications handler:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
};

async function handleAdminSubscribe(event) {
  try {
    const origin = extractOriginFromEvent(event);
    
    // Check if user is admin
    if (!isAdmin(event)) {
      return corsErrorResponse(403, "Admin access required", origin);
    }

    const body = JSON.parse(event.body);
    const { email } = body;

    if (!email) {
      return corsErrorResponse(400, "Email is required", origin);
    }

    // Check if already subscribed
    const existingSubscriptions = await snsClient.send(
      new ListSubscriptionsByTopicCommand({
        TopicArn: ADMIN_NOTIFICATIONS_TOPIC_ARN,
      })
    );

    const isAlreadySubscribed = existingSubscriptions.Subscriptions.some(
      (sub) => sub.Endpoint === email && sub.Protocol === "email"
    );

    if (isAlreadySubscribed) {
      return corsResponse(
        200,
        {
          success: true,
          message: "Already subscribed to admin notifications",
          subscribed: true,
        },
        origin
      );
    }

    // Subscribe admin email to notifications
    const subscribeResult = await snsClient.send(
      new SubscribeCommand({
        TopicArn: ADMIN_NOTIFICATIONS_TOPIC_ARN,
        Protocol: "email",
        Endpoint: email,
      })
    );

    return corsResponse(
      200,
      {
        success: true,
        message: "Successfully subscribed to admin notifications. Please check your email to confirm the subscription.",
        subscriptionArn: subscribeResult.SubscriptionArn,
        subscribed: true,
      },
      origin
    );
  } catch (error) {
    console.error("Admin subscribe error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleAdminSubscriptionStatus(event) {
  try {
    const origin = extractOriginFromEvent(event);
    
    // Check if user is admin
    if (!isAdmin(event)) {
      return corsErrorResponse(403, "Admin access required", origin);
    }

    const queryParams = event.queryStringParameters || {};
    const { email } = queryParams;

    if (!email) {
      return corsErrorResponse(400, "Email is required", origin);
    }

    // Check subscription status
    const subscriptions = await snsClient.send(
      new ListSubscriptionsByTopicCommand({
        TopicArn: ADMIN_NOTIFICATIONS_TOPIC_ARN,
      })
    );

    const subscription = subscriptions.Subscriptions.find(
      (sub) => sub.Endpoint === email && sub.Protocol === "email"
    );

    return corsResponse(
      200,
      {
        success: true,
        subscribed: !!subscription,
        status: subscription ? subscription.SubscriptionArn : "not_subscribed",
      },
      origin
    );
  } catch (error) {
    console.error("Admin subscription status error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleUserBookingConfirmation(event) {
  try {
    const origin = extractOriginFromEvent(event);
    const body = JSON.parse(event.body);
    
    const { 
      userEmail, 
      bookingId, 
      roomTitle, 
      checkIn, 
      checkOut, 
      totalPrice, 
      dogs 
    } = body;

    if (!userEmail || !bookingId) {
      return corsErrorResponse(400, "User email and booking ID are required", origin);
    }

    // Create user-specific message
    const message = `
🐕 Dogotel Booking Confirmation 🐕

Dear Guest,

Your booking has been confirmed! Here are the details:

📋 Booking ID: ${bookingId}
🏨 Room: ${roomTitle}
📅 Check-in: ${checkIn}
📅 Check-out: ${checkOut}
🐕 Dogs: ${Array.isArray(dogs) ? dogs.map(d => d.name || d).join(', ') : 'N/A'}
💰 Total Price: $${totalPrice}

Thank you for choosing Dogotel! We can't wait to welcome you and your furry friends.

Best regards,
The Dogotel Team
`;

    // Subscribe user to notifications (they will only get their own booking confirmations)
    try {
      // First, subscribe the user to the topic
      await snsClient.send(
        new SubscribeCommand({
          TopicArn: USER_NOTIFICATIONS_TOPIC_ARN,
          Protocol: "email",
          Endpoint: userEmail,
        })
      );
      console.log(`User subscribed to notifications: ${userEmail}`);
    } catch (subscribeError) {
      console.log("User subscription failed (possibly already subscribed):", subscribeError.message);
      // Continue even if subscription fails
    }

    // Send the booking confirmation email directly to the user
    try {
      await snsClient.send(
        new PublishCommand({
          TopicArn: USER_NOTIFICATIONS_TOPIC_ARN,
          Message: message,
          Subject: `Dogotel Booking Confirmation - ${bookingId}`,
          MessageAttributes: {
            email: {
              DataType: "String",
              StringValue: userEmail,
            },
            bookingId: {
              DataType: "String",
              StringValue: bookingId,
            },
          },
        })
      );
      console.log(`Booking confirmation sent to ${userEmail}`);
    } catch (publishError) {
      console.error("Failed to send user notification:", publishError);
      // Continue - don't fail the API call
    }

    return corsResponse(
      200,
      {
        success: true,
        message: "Booking confirmation sent to user",
      },
      origin
    );
  } catch (error) {
    console.error("User booking confirmation error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleDailyRoomsSubscribe(event) {
  try {
    const origin = extractOriginFromEvent(event);
    const body = JSON.parse(event.body);
    const { email } = body;

    if (!email) {
      return corsErrorResponse(400, "Email is required", origin);
    }

    if (!DAILY_ROOMS_TOPIC_ARN) {
      return corsErrorResponse(500, "Daily rooms notifications not configured", origin);
    }

    // Check if already subscribed
    const existingSubscriptions = await snsClient.send(
      new ListSubscriptionsByTopicCommand({
        TopicArn: DAILY_ROOMS_TOPIC_ARN,
      })
    );

    const isAlreadySubscribed = existingSubscriptions.Subscriptions.some(
      (sub) => sub.Endpoint === email && sub.Protocol === "email"
    );

    if (isAlreadySubscribed) {
      return corsResponse(
        200,
        {
          success: true,
          message: "Already subscribed to daily room notifications",
          subscribed: true,
        },
        origin
      );
    }

    // Subscribe to daily room notifications
    const subscribeResult = await snsClient.send(
      new SubscribeCommand({
        TopicArn: DAILY_ROOMS_TOPIC_ARN,
        Protocol: "email",
        Endpoint: email,
      })
    );

    return corsResponse(
      200,
      {
        success: true,
        message: "Successfully subscribed to daily room notifications. Please check your email to confirm the subscription.",
        subscriptionArn: subscribeResult.SubscriptionArn,
        subscribed: true,
      },
      origin
    );
  } catch (error) {
    console.error("Daily rooms subscribe error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleDailyRoomsUnsubscribe(event) {
  try {
    const origin = extractOriginFromEvent(event);
    const body = JSON.parse(event.body);
    const { email } = body;

    if (!email) {
      return corsErrorResponse(400, "Email is required", origin);
    }

    if (!DAILY_ROOMS_TOPIC_ARN) {
      return corsErrorResponse(500, "Daily rooms notifications not configured", origin);
    }

    // Find and unsubscribe
    const subscriptions = await snsClient.send(
      new ListSubscriptionsByTopicCommand({
        TopicArn: DAILY_ROOMS_TOPIC_ARN,
      })
    );

    const subscription = subscriptions.Subscriptions.find(
      (sub) => sub.Endpoint === email && sub.Protocol === "email"
    );

    if (subscription) {
      await snsClient.send(
        new UnsubscribeCommand({
          SubscriptionArn: subscription.SubscriptionArn,
        })
      );

      return corsResponse(
        200,
        {
          success: true,
          message: "Successfully unsubscribed from daily room notifications",
          subscribed: false,
        },
        origin
      );
    } else {
      return corsResponse(
        200,
        {
          success: true,
          message: "Email not found in subscriptions",
          subscribed: false,
        },
        origin
      );
    }
  } catch (error) {
    console.error("Daily rooms unsubscribe error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

// Helper function to subscribe user to daily room notifications (called during signup)
exports.subscribeUserToDailyRooms = async (userEmail) => {
  if (!DAILY_ROOMS_TOPIC_ARN || !userEmail) {
    console.log("Daily rooms topic not configured or no email provided");
    return false;
  }

  try {
    await snsClient.send(
      new SubscribeCommand({
        TopicArn: DAILY_ROOMS_TOPIC_ARN,
        Protocol: "email",
        Endpoint: userEmail,
      })
    );

    console.log(`User ${userEmail} subscribed to daily room notifications`);
    return true;
  } catch (error) {
    console.error(`Failed to subscribe ${userEmail} to daily room notifications:`, error);
    return false;
  }
};

// Helper function to notify admin about new bookings
exports.notifyAdminOfNewBooking = async (bookingData, roomData) => {
  try {
    const message = `
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

    await snsClient.send(
      new PublishCommand({
        TopicArn: ADMIN_NOTIFICATIONS_TOPIC_ARN,
        Message: message,
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

    console.log("Admin notification sent successfully");
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    // Don't throw error to prevent booking failure
  }
};

async function handleTestAdminNotification(event) {
  try {
    const origin = extractOriginFromEvent(event);
    
    // Check if user is admin
    if (!isAdmin(event)) {
      return corsErrorResponse(403, "Admin access required", origin);
    }

    if (!ADMIN_NOTIFICATIONS_TOPIC_ARN) {
      return corsErrorResponse(500, "Admin notifications topic not configured", origin);
    }

    const testMessage = `🧪 TEST NOTIFICATION 🧪

This is a test message to verify that admin notifications are working properly.

📧 Topic ARN: ${ADMIN_NOTIFICATIONS_TOPIC_ARN}
⏰ Test Time: ${new Date().toLocaleString()}
🔧 Test Source: Admin Dashboard

If you receive this email, the notification system is working correctly!

---
Dogotel Admin Notification System Test`;

    console.log("📧 Sending test admin notification...");
    const publishResult = await snsClient.send(
      new PublishCommand({
        TopicArn: ADMIN_NOTIFICATIONS_TOPIC_ARN,
        Message: testMessage,
        Subject: "🧪 Dogotel Admin Notification Test",
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "TEST_NOTIFICATION",
          },
          testTime: {
            DataType: "String",
            StringValue: new Date().toISOString(),
          },
        },
      })
    );

    console.log("✅ Test notification sent successfully!");
    console.log("📧 SNS Message ID:", publishResult.MessageId);

    return corsResponse(
      200,
      {
        success: true,
        message: "Test notification sent successfully to all subscribed admins",
        messageId: publishResult.MessageId,
        topicArn: ADMIN_NOTIFICATIONS_TOPIC_ARN,
      },
      origin
    );
  } catch (error) {
    console.error("❌ Test admin notification failed:", error);
    return corsErrorResponse(
      500,
      `Test notification failed: ${error.message}`,
      extractOriginFromEvent(event)
    );
  }
}