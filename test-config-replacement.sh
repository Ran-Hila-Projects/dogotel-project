#!/bin/bash

# Test config replacement with actual CloudFormation values
ACCOUNT_ID="652867883117"
PROJECT_NAME="dogotel"
REGION="us-east-1"

# Actual CloudFormation outputs from user
API_URL="https://4rn4hvi90j.execute-api.us-east-1.amazonaws.com/Prod/"
IMAGES_BUCKET="dogotel-images-652867883117"
USER_POOL_ID="us-east-1_M0krKvpla"
CLIENT_ID="3d50gfrhl105mk71k8nclunqo6"

# Calculate additional values
WEBSITE_BUCKET="${PROJECT_NAME}-website-${ACCOUNT_ID}"
UNIQUE_DOMAIN="${PROJECT_NAME}-auth-$(date +%s)"
COGNITO_HOSTED_UI_URL="https://${UNIQUE_DOMAIN}.auth.${REGION}.amazoncognito.com"
REDIRECT_URL="http://${WEBSITE_BUCKET}.s3-website-${REGION}.amazonaws.com"

echo "=== VALUES TO BE REPLACED ==="
echo "API_URL: ${API_URL}"
echo "COGNITO_USER_POOL_ID: ${USER_POOL_ID}"
echo "COGNITO_CLIENT_ID: ${CLIENT_ID}"
echo "S3_BUCKET_NAME: ${IMAGES_BUCKET}"
echo "IMAGE_BASE_URL: https://${IMAGES_BUCKET}.s3.amazonaws.com/images/"
echo "COGNITO_HOSTED_UI_URL: ${COGNITO_HOSTED_UI_URL}"
echo "REDIRECT_URL: ${REDIRECT_URL}"
echo ""

# Test replacement on a copy of config.js
cp dogotel-frontend/src/config.js config-test.js

sed -i.bak \
  -e "s|__API_URL__|${API_URL}|g" \
  -e "s|__COGNITO_USER_POOL_ID__|${USER_POOL_ID}|g" \
  -e "s|__COGNITO_CLIENT_ID__|${CLIENT_ID}|g" \
  -e "s|__S3_BUCKET_NAME__|${IMAGES_BUCKET}|g" \
  -e "s|__IMAGE_BASE_URL__|https://${IMAGES_BUCKET}.s3.amazonaws.com/images/|g" \
  -e "s|__COGNITO_HOSTED_UI_URL__|${COGNITO_HOSTED_UI_URL}|g" \
  -e "s|__REDIRECT_URL__|${REDIRECT_URL}|g" \
  "config-test.js"

echo "=== RESULT AFTER REPLACEMENT ==="
cat config-test.js
echo ""

# Cleanup
rm -f config-test.js config-test.js.bak

echo "✅ Test complete!" 