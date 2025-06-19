const CONFIG = {
  API_URL: "http://localhost:3000/", // Replace with your API Gateway endpoint
  COGNITO_USER_POOL_ID: "us-east-1_XXXXXXXXX", // Replace with your Cognito User Pool ID
  COGNITO_CLIENT_ID: "XXXXXXXXXXXXXXXXXXXXXXXXXX", // Replace with your Cognito App Client ID
  REGION: "us-east-1", // Your AWS region
  S3_BUCKET_NAME: "your-s3-bucket-name", // Replace with your S3 bucket name
  IMAGE_BASE_URL: "https://your-s3-bucket.s3.amazonaws.com/images/", // Optional: base path for uploaded images
};

export default CONFIG;
