#!/bin/bash

# Dogotel SAM Deployment Script
# Deploy the Dogotel serverless backend to AWS

set -e  # Exit on any error

echo "🚀 DOGOTEL SAM DEPLOYMENT"
echo "========================="
echo ""

# Check if we're in the right directory
if [ ! -f "template.yaml" ]; then
    echo "❌ Error: template.yaml not found. Run this script from the aws/ directory."
    exit 1
fi

# Check dependencies
echo "🔍 Checking dependencies..."

if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ Dependencies check passed"
echo ""

# Build the application
echo "🔨 Building SAM application..."
sam build
echo "✅ Build completed"
echo ""

# Deploy the application
echo "📦 Deploying to AWS..."
sam deploy --guided --stack-name dogotel-stack

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Deployment completed"
echo ""

# Get outputs
echo "📊 Getting deployment outputs..."
API_URL=$(aws cloudformation describe-stacks --stack-name dogotel-stack --query 'Stacks[0].Outputs[?OutputKey==`DogotelApiUrl`].OutputValue' --output text)
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name dogotel-stack --query 'Stacks[0].Outputs[?OutputKey==`ImagesBucketName`].OutputValue' --output text)
S3_URL=$(aws cloudformation describe-stacks --stack-name dogotel-stack --query 'Stacks[0].Outputs[?OutputKey==`ImagesBucketUrl`].OutputValue' --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name dogotel-stack --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name dogotel-stack --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolClientId`].OutputValue' --output text)
REGION=$(aws configure get region || echo "us-east-1")

echo ""
echo "=== DEPLOYMENT SUCCESSFUL ==="
echo ""
echo "🔧 FRONTEND CONFIG.JS:"
echo "======================"
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
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Copy the config above to your frontend config.js"
echo "2. Initialize sample data: curl -X POST $API_URL/admin/initialize"
echo "3. Upload frontend files with: ./upload-website.sh"
echo ""
echo "📋 TEST API:"
echo "curl -X GET $API_URL/rooms" 