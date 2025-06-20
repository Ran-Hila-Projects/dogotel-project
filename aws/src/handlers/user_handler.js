const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
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
const { v4: uuidv4 } = require("uuid");

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const USERS_TABLE = process.env.USERS_TABLE || "DogotelUsers";
const DOGS_TABLE = process.env.DOGS_TABLE || "DogotelDogs";
const USER_POOL_ID = process.env.USER_POOL_ID;

exports.handler = async (event, context) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    const httpMethod = event.httpMethod;
    const path = event.path;
    const origin = extractOriginFromEvent(event);

    console.log(`Processing ${httpMethod} ${path} from origin: ${origin}`);

    if (httpMethod === "OPTIONS") {
      return handlePreflightRequest(event, origin);
    }

    if (path.startsWith("/api/user/dogs") && httpMethod === "POST") {
      return await handleAddDog(event);
    } else if (
      path.startsWith("/api/user/") &&
      path.endsWith("/dogs") &&
      httpMethod === "GET"
    ) {
      const email = path.split("/api/user/")[1].split("/dogs")[0];
      return await handleGetDogs(event, email);
    } else if (path.startsWith("/user/") && httpMethod === "GET") {
      const email = path.split("/user/")[1];
      return await handleGetUserProfile(event, email);
    } else if (path === "/user/profile-photo" && httpMethod === "POST") {
      return await handleUpdateProfilePhoto(event);
    } else if (path === "/user/profile" && httpMethod === "PUT") {
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

async function handleAddDog(event) {
  const origin = extractOriginFromEvent(event);
  try {
    const body = JSON.parse(event.body);
    const { userEmail, name, age, breed, photo } = body;

    if (!userEmail || !name || !age || !breed || !photo) {
      return corsErrorResponse(400, "Missing required dog information", origin);
    }

    const dogId = uuidv4();
    const newDog = {
      dogId,
      userEmail,
      name,
      age,
      breed,
      photo,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: DOGS_TABLE,
        Item: newDog,
      })
    );

    return corsResponse(201, { success: true, dog: newDog }, origin);
  } catch (error) {
    console.error("Add dog error:", error);
    return corsErrorResponse(500, "Failed to add dog", origin);
  }
}

async function handleGetDogs(event, userEmail) {
  const origin = extractOriginFromEvent(event);
  try {
    const decodedEmail = decodeURIComponent(userEmail);
    if (!decodedEmail) {
      return corsErrorResponse(400, "User email is required", origin);
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: DOGS_TABLE,
        IndexName: "UserEmailIndex",
        KeyConditionExpression: "userEmail = :userEmail",
        ExpressionAttributeValues: {
          ":userEmail": decodedEmail,
        },
      })
    );

    return corsResponse(200, { success: true, dogs: result.Items }, origin);
  } catch (error) {
    console.error("Get dogs error:", error);
    return corsErrorResponse(500, "Failed to get dogs", origin);
  }
}

async function handleGetUserProfile(event, userEmail) {
  try {
    const origin = extractOriginFromEvent(event);
    const decodedEmail = decodeURIComponent(userEmail);

    if (!decodedEmail) {
      return corsErrorResponse(400, "User email is required", origin);
    }

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
        photoUrl: photo,
      },
      origin
    );
  } catch (error) {
    console.error("Error updating profile photo:", error);
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
    const { email, ...updateData } = body;

    if (!email) {
      return corsErrorResponse(400, "Email is required", origin);
    }

    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    for (const [key, value] of Object.entries(updateData)) {
      updateExpressionParts.push(`${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
    }

    if (updateExpressionParts.length === 0) {
      return corsErrorResponse(400, "No update data provided", origin);
    }

    const updateExpression = `SET ${updateExpressionParts.join(
      ", "
    )}, updated_at = :updated_at`;
    expressionAttributeValues[":updated_at"] = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { email },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return corsResponse(200, { success: true }, origin);
  } catch (error) {
    console.error("Update user profile error:", error);
    return corsErrorResponse(
      500,
      "Internal server error",
      extractOriginFromEvent(event)
    );
  }
}
