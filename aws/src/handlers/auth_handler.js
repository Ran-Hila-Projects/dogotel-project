const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminInitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  // CORS headers - same pattern as example
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  };

  console.log('=== AUTH LAMBDA START ===');
  console.log('Event:', JSON.stringify(event, null, 2));

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

    if (path === '/auth/register' && method === 'POST') {
      return await handleRegister(event, corsHeaders);
    } else if (path === '/auth/login' && method === 'POST') {
      return await handleLogin(event, corsHeaders);
    } else {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Endpoint not found'
        })
      };
    }
  } catch (error) {
    console.error('=== AUTH ERROR ===');
    console.error('Error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Authentication failed'
      })
    };
  }
};

async function handleRegister(event, corsHeaders) {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { email, password, firstName, lastName } = body;

    if (!email || !password || !firstName || !lastName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: email, password, firstName, lastName'
        })
      };
    }

    console.log(`Registering user: ${email}`);

    // Create user in Cognito
    const createUserParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        { Name: 'email_verified', Value: 'true' }
      ],
      MessageAction: 'SUPPRESS'
    };

    await cognitoClient.send(new AdminCreateUserCommand(createUserParams));

    // Set permanent password
    const setPasswordParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    };

    await cognitoClient.send(new AdminSetUserPasswordCommand(setPasswordParams));

    console.log('User registered successfully');

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'User registered successfully',
        email: email
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'UsernameExistsException') {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'User already exists'
        })
      };
    }
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Registration failed',
        message: error.message
      })
    };
  }
}

async function handleLogin(event, corsHeaders) {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Email and password required'
        })
      };
    }

    console.log(`Login attempt for user: ${email}`);

    const authParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    };

    const result = await cognitoClient.send(new AdminInitiateAuthCommand(authParams));

    console.log('Login successful');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        refreshToken: result.AuthenticationResult.RefreshToken
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    
    if (error.name === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      };
    }
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Login failed',
        message: error.message
      })
    };
  }
} 