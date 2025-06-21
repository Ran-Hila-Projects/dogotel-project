const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AdminListGroupsForUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE || "DogotelUsers";

exports.handler = async (event) => {
  // CORS headers - same pattern as example
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  };

  console.log("=== AUTH LAMBDA START ===");
  console.log("Event:", JSON.stringify(event, null, 2));

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight success" }),
    };
  }

  try {
    const path = event.path;
    const method = event.httpMethod;

    if (path === "/auth/register" && method === "POST") {
      return await handleRegister(event, corsHeaders);
    } else if (path === "/auth/login" && method === "POST") {
      return await handleLogin(event, corsHeaders);
    } else if (path === "/auth/check-admin" && method === "POST") {
      return await handleCheckAdmin(event, corsHeaders);
    } else {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Endpoint not found",
        }),
      };
    }
  } catch (error) {
    console.error("=== AUTH ERROR ===");
    console.error("Error:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: "Authentication failed",
      }),
    };
  }
};

async function handleRegister(event, corsHeaders) {
  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { email, password, firstName, lastName, birthday } = body;

    if (!email || !password || !firstName || !lastName || !birthday) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error:
            "Missing required fields: email, password, firstName, lastName, birthday",
        }),
      };
    }

    console.log(`Registering user: ${email}`);

    // Create user in Cognito
    const createUserParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
        { Name: "birthdate", Value: birthday },
        { Name: "email_verified", Value: "true" },
      ],
      MessageAction: "SUPPRESS",
    };

    await cognitoClient.send(new AdminCreateUserCommand(createUserParams));

    // Set permanent password
    const setPasswordParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true,
    };

    await cognitoClient.send(
      new AdminSetUserPasswordCommand(setPasswordParams)
    );

    // Save user data to DynamoDB
    const userData = {
      email: email,
      firstName: firstName,
      lastName: lastName,
      username: `${firstName} ${lastName}`,
      birthdate: birthday || "", // Use birthday from signup form if provided
      profilePhoto: "", // Empty initially, can be updated in profile
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const putParams = {
      TableName: USERS_TABLE,
      Item: userData,
    };

    await docClient.send(new PutCommand(putParams));

    console.log("User registered successfully and saved to DynamoDB");

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "User registered successfully",
        email: email,
        userData: userData,
      }),
    };
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "UsernameExistsException") {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "User already exists",
        }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: "Registration failed",
        message: error.message,
      }),
    };
  }
}

async function handleLogin(event, corsHeaders) {
  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Email and password required",
        }),
      };
    }

    console.log(`Login attempt for user: ${email}`);

    const authParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    const result = await cognitoClient.send(
      new AdminInitiateAuthCommand(authParams)
    );

    console.log("Login successful");

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Login successful",
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        refreshToken: result.AuthenticationResult.RefreshToken,
      }),
    };
  } catch (error) {
    console.error("Login error:", error);

    if (error.name === "NotAuthorizedException") {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Invalid credentials",
        }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: "Login failed",
        message: error.message,
      }),
    };
  }
}

async function handleCheckAdmin(event, corsHeaders) {
  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { email } = body;

    if (!email) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Email is required",
        }),
      };
    }

    console.log(`Checking admin status for user: ${email}`);

    try {
      // Check if user is in admin group
      const listGroupsParams = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: email,
      };

      const result = await cognitoClient.send(
        new AdminListGroupsForUserCommand(listGroupsParams)
      );
      const groups = result.Groups || [];

      // Check if user is in admin group
      const isAdmin = groups.some(
        (group) =>
          group.GroupName === "admin" ||
          group.GroupName === "Admin" ||
          group.GroupName === "ADMIN"
      );

      console.log(
        `User ${email} admin status: ${isAdmin}, groups: ${groups
          .map((g) => g.GroupName)
          .join(", ")}`
      );

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          isAdmin: isAdmin,
          groups: groups.map((g) => g.GroupName),
        }),
      };
    } catch (cognitoError) {
      console.log(
        `User ${email} not found in Cognito or error checking groups:`,
        cognitoError.message
      );

      // If user doesn't exist in Cognito, check if it's a hardcoded admin email
      const adminEmails = ["admin@dogotel.com", "admin@example.com"];
      const isHardcodedAdmin = adminEmails.includes(email.toLowerCase());

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          isAdmin: isHardcodedAdmin,
          groups: isHardcodedAdmin ? ["admin"] : [],
          note: isHardcodedAdmin
            ? "Hardcoded admin user"
            : "User not found in Cognito",
        }),
      };
    }
  } catch (error) {
    console.error("Admin check error:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: "Failed to check admin status",
        message: error.message,
      }),
    };
  }
}
