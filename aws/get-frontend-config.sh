#!/bin/bash

# Get Frontend Config Values Script
# This script extracts the necessary configuration values for frontend config.js

echo "🔧 FRONTEND CONFIG.JS VALUES"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "template.yaml" ]; then
    echo "❌ Error: template.yaml not found. Run this script from the aws/ directory."
    exit 1
fi

# Try to get values from AWS CloudFormation stack
STACK_NAME="dogotel-stack"

echo "📍 Extracting values from deployed stack: $STACK_NAME"
echo ""

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`DogotelApiUrl`].OutputValue' --output text 2>/dev/null)

# Get S3 Bucket Name
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ImagesBucketName`].OutputValue' --output text 2>/dev/null)

# Get S3 Bucket URL
S3_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ImagesBucketUrl`].OutputValue' --output text 2>/dev/null)

# Get Cognito User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' --output text 2>/dev/null)

# Get Cognito User Pool Client ID
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolClientId`].OutputValue' --output text 2>/dev/null)

# Get AWS Region
REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")

if [ -n "$API_URL" ]; then
    echo "✅ Found deployed stack outputs"
    echo ""
    echo "📋 Copy this to your frontend config.js:"
    echo ""
    echo "const CONFIG = {"
    echo "  API_URL: \"$API_URL\","
    echo "  REGION: \"$REGION\","
    echo "  S3_BUCKET_NAME: \"$S3_BUCKET\","
    echo "  IMAGE_BASE_URL: \"${S3_URL}images/\","
    echo "  COGNITO_USER_POOL_ID: \"$USER_POOL_ID\","
    echo "  COGNITO_USER_POOL_CLIENT_ID: \"$USER_POOL_CLIENT_ID\""
    echo "};"
    echo ""
    echo "export default CONFIG;"
else
    echo "⚠️  Stack not deployed yet. After deployment, you'll get:"
    echo ""
    echo "📋 Frontend config.js template:"
    echo ""
    echo "const CONFIG = {"
    echo "  API_URL: \"https://YOUR-API-ID.execute-api.$REGION.amazonaws.com/prod/\","
    echo "  REGION: \"$REGION\","
    echo "  S3_BUCKET_NAME: \"YOUR-S3-BUCKET-NAME\","
    echo "  IMAGE_BASE_URL: \"https://YOUR-S3-BUCKET.s3.amazonaws.com/images/\","
    echo "  COGNITO_USER_POOL_ID: \"YOUR-USER-POOL-ID\","
    echo "  COGNITO_USER_POOL_CLIENT_ID: \"YOUR-CLIENT-ID\""
    echo "};"
    echo ""
    echo "export default CONFIG;"
    echo ""
    echo "🚀 Deploy first with: ./deploy-sam.sh"
fi

echo ""
echo "📝 This config enables the frontend to:"
echo "   - Make API calls to your deployed backend"
echo "   - Upload/display images from S3"
echo "   - Work with the correct AWS region"
echo "   - Authenticate users with Cognito" 