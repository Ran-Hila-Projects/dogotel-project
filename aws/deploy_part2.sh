#!/bin/bash

echo "🔐 Enter your AWS Account ID (must be the same as in Part 1):"
read ACCOUNT_ID

if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ Error: AWS Account ID cannot be empty."
    exit 1
fi

PROJECT_NAME="dogotel"
REGION="us-east-1"
WEBSITE_BUCKET="$PROJECT_NAME-website-$ACCOUNT_ID"

echo "🪣 Ensuring website S3 bucket $WEBSITE_BUCKET exists..."
aws s3api head-bucket --bucket "$WEBSITE_BUCKET" 2>/dev/null || aws s3 mb "s3://$WEBSITE_BUCKET" --region "$REGION"

echo "🌐 Configuring S3 website hosting for $WEBSITE_BUCKET..."
aws s3 website "s3://$WEBSITE_BUCKET" --index-document index.html --error-document index.html

echo "🔓 Disabling block public access settings for $WEBSITE_BUCKET..."
aws s3api put-public-access-block --bucket "$WEBSITE_BUCKET" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo "🔐 Applying public-read bucket policy to $WEBSITE_BUCKET..."
POLICY_JSON=$(cat <<-EOF
{
  "Version":"2012-10-17",
  "Statement":[{
    "Sid":"PublicReadGetObject",
    "Effect":"Allow",
    "Principal":"*",
    "Action":"s3:GetObject",
    "Resource":"arn:aws:s3:::${WEBSITE_BUCKET}/*"
  }]
}
EOF
)

aws s3api put-bucket-policy --bucket "$WEBSITE_BUCKET" --policy "$POLICY_JSON"
if [ $? -ne 0 ]; then
    echo "⚠️ Warning: Failed to apply public-read bucket policy. The website might not be publicly accessible."
    echo "This could be due to permissions or eventual consistency. You might need to apply it manually or retry."
else
    echo "✅ Public-read bucket policy applied successfully."
fi

echo "📤 Uploading website files to $WEBSITE_BUCKET..."
# Make sure we're in the right directory relative to the dogotel-frontend folder
if [ -d "../dogotel-frontend" ]; then
    cd ../dogotel-frontend
    
    echo "📦 Installing dependencies..."
    npm install
    
    echo "🔨 Building React app..."
    npm run build
    
    if [ -d "build" ]; then
        aws s3 sync build/ "s3://$WEBSITE_BUCKET" --delete
    else
        echo "❌ Error: 'build' directory not found. Build failed or wrong directory."
        exit 1
    fi
else
    echo "❌ Error: 'dogotel-frontend' directory not found. Please run this script from the project's root aws/ directory."
    exit 1
fi

echo "🔍 Verifying uploaded site files..."
aws s3api head-object --bucket "$WEBSITE_BUCKET" --key index.html >/dev/null 2>&1 && \
echo "✅ Essential files (index.html) uploaded successfully!" || \
echo "❌ Error: index.html might be missing in the website bucket."

echo "🌍 Your website should be available at (allow a few moments for S3 to propagate changes):"
echo "http://$WEBSITE_BUCKET.s3-website-$REGION.amazonaws.com"
echo "Part 2 (Website Upload) completed." 