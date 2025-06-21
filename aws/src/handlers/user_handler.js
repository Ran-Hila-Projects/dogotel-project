const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const {
  corsResponse,
  corsErrorResponse,
  handlePreflightRequest,
  extractOriginFromEvent,
} = require("./cors_utils");

// Initialize AWS clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE || "DogotelUsers";
const USER_POOL_ID = process.env.USER_POOL_ID;

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

    if (path.startsWith("/user/") && httpMethod === "GET") {
      // Handle GET /user/:email for user profile
      const email = path.split("/user/")[1];
      return await handleGetUserProfile(event, email);
    } else if (path === "/user/profile-photo" && httpMethod === "POST") {
      // Handle POST /user/profile-photo for updating profile photo
      return await handleUpdateProfilePhoto(event);
    } else if (path === "/user/profile" && httpMethod === "PUT") {
      // Handle PUT /user/profile for updating user profile
      return await handleUpdateUserProfile(event);
    } else {
      return corsErrorResponse(404, "Endpoint not found", origin);
    }
  } catch (error) {
    console.error("Error in user handler:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
};

async function handleGetUserProfile(event, userEmail) {
  try {
    const origin = extractOriginFromEvent(event);
    const decodedEmail = decodeURIComponent(userEmail);

    if (!decodedEmail) {
      return corsErrorResponse(400, "User email is required", origin);
    }

    // Get user from Cognito to ensure we have the latest attributes
    let cognitoUser;
    try {
      cognitoUser = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: decodedEmail,
        })
      );
    } catch (cognitoError) {
      console.warn(
        "Could not find user in Cognito, will check DynamoDB.",
        cognitoError
      );
    }

    // Get user from DynamoDB
    const dynamoResult = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { email: decodedEmail },
      })
    );

    if (!dynamoResult.Item && !cognitoUser) {
      return corsErrorResponse(
        404,
        "User not found in Cognito or DynamoDB",
        origin
      );
    }

    // Merge data from Cognito and DynamoDB
    const cognitoAttributes = {};
    if (cognitoUser && cognitoUser.UserAttributes) {
      cognitoUser.UserAttributes.forEach((attr) => {
        cognitoAttributes[attr.Name] = attr.Value;
      });
    }

    const dynamoData = dynamoResult.Item || {};

    const mergedUser = {
      email: decodedEmail,
      username:
        cognitoAttributes.preferred_username ||
        dynamoData.username ||
        `${cognitoAttributes.given_name} ${cognitoAttributes.family_name}`.trim() ||
        decodedEmail.split("@")[0],
      firstName: cognitoAttributes.given_name || dynamoData.firstName || "",
      lastName: cognitoAttributes.family_name || dynamoData.lastName || "",
      birthdate: cognitoAttributes.birthdate || dynamoData.birthdate || "",
      photo: dynamoData.photo || dynamoData.profilePhoto || "",
      createdAt: cognitoUser
        ? new Date(cognitoUser.UserCreateDate).toISOString()
        : dynamoData.createdAt,
      updatedAt: cognitoUser
        ? new Date(cognitoUser.UserLastModifiedDate).toISOString()
        : dynamoData.updatedAt,
    };

    // If user was in Cognito but not Dynamo, create a record for them
    if (cognitoUser && !dynamoResult.Item) {
      await docClient.send(
        new PutCommand({
          TableName: USERS_TABLE,
          Item: {
            email: mergedUser.email,
            firstName: mergedUser.firstName,
            lastName: mergedUser.lastName,
            username: mergedUser.username,
            birthdate: mergedUser.birthdate,
            profilePhoto: mergedUser.photo,
            createdAt: mergedUser.createdAt,
            updatedAt: mergedUser.updatedAt,
          },
        })
      );
    }

    return corsResponse(
      200,
      {
        success: true,
        user: mergedUser,
      },
      origin
    );
  } catch (error) {
    console.error("Get user profile error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleUpdateProfilePhoto(event) {
  try {
    const origin = extractOriginFromEvent(event);
    const body = JSON.parse(event.body);
    const { email, photo } = body;

    if (!email || !photo) {
      return corsErrorResponse(400, "Email and photo are required", origin);
    }

    // Update user profile photo in DynamoDB using UpdateCommand to preserve other data
    const result = await docClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { email: email },
        UpdateExpression: "SET photo = :photo, updated_at = :updated_at",
        ExpressionAttributeValues: {
          ":photo": photo,
          ":updated_at": new Date().toISOString(),
        },
      })
    );

    return corsResponse(
      200,
      {
        success: true,
        message: "Profile photo updated successfully",
        photoUrl: photo,
      },
      origin
    );
  } catch (error) {
    console.error("Update profile photo error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}

async function handleUpdateUserProfile(event) {
  try {
    const origin = extractOriginFromEvent(event);
    const body = JSON.parse(event.body);
    const { email, username, birthdate, photo } = body;

    if (!email) {
      return corsErrorResponse(400, "Email is required", origin);
    }

    // Build update expression dynamically
    const updateExpressions = [];
    const expressionAttributeValues = {
      ":updated_at": new Date().toISOString(),
    };

    if (username) {
      updateExpressions.push("username = :username");
      expressionAttributeValues[":username"] = username;
    }

    if (birthdate) {
      updateExpressions.push("birthdate = :birthdate");
      expressionAttributeValues[":birthdate"] = birthdate;
    }

    if (photo !== undefined) {
      updateExpressions.push("photo = :photo");
      expressionAttributeValues[":photo"] = photo;
    }

    updateExpressions.push("updated_at = :updated_at");

    // Update user profile in DynamoDB
    const result = await docClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { email: email },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    return corsResponse(
      200,
      {
        success: true,
        message: "Profile updated successfully",
        user: {
          username: result.Attributes.username,
          birthdate: result.Attributes.birthdate,
          email: result.Attributes.email,
          photo: result.Attributes.photo || "",
        },
      },
      origin
    );
  } catch (error) {
    console.error("Update user profile error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}
