#!/bin/bash

# Dogotel Frontend Upload Script
# Upload frontend files to S3 bucket

set -e  # Exit on any error

echo "📤 UPLOADING DOGOTEL FRONTEND"
echo "============================="
echo ""

# Check if we're in the right directory
if [ ! -f "template.yaml" ]; then
    echo "❌ Error: template.yaml not found. Run this script from the aws/ directory."
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "../dogotel-frontend" ]; then
    echo "❌ Error: Frontend directory not found at ../dogotel-frontend"
    exit 1
fi

# Get S3 bucket name from CloudFormation stack
STACK_NAME="dogotel-stack"
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ImagesBucketName`].OutputValue' --output text 2>/dev/null)

if [ -z "$S3_BUCKET" ]; then
    echo "❌ Error: Could not get S3 bucket name. Make sure the stack is deployed first."
    echo "   Run: ./deploy-sam.sh"
    exit 1
fi

echo "📦 S3 Bucket: $S3_BUCKET"
echo ""

# Build frontend (if package.json exists)
if [ -f "../dogotel-frontend/package.json" ]; then
    echo "🔨 Building frontend..."
    cd ../dogotel-frontend
    
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing dependencies..."
        npm install
    fi
    
    echo "🏗️ Building React app..."
    npm run build
    
    cd ../aws
    echo "✅ Build completed"
    echo ""
fi

# Upload build files to S3
if [ -d "../dogotel-frontend/build" ]; then
    echo "📤 Uploading build files to S3..."
    aws s3 sync ../dogotel-frontend/build/ s3://$S3_BUCKET/ --delete
    echo "✅ Frontend uploaded successfully"
else
    echo "📤 Uploading source files to S3..."
    aws s3 sync ../dogotel-frontend/src/ s3://$S3_BUCKET/ --delete
    aws s3 sync ../dogotel-frontend/public/ s3://$S3_BUCKET/ --delete
    echo "✅ Frontend uploaded successfully"
fi

# Get S3 website URL
S3_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ImagesBucketUrl`].OutputValue' --output text)

echo ""
echo "🌐 Frontend URL: $S3_URL"
echo ""
echo "✅ Upload completed successfully!" 