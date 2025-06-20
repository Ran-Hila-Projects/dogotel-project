#!/bin/bash
set -e

####################### INPUT
read -rp "🔐 Enter your AWS Account ID: " ACCOUNT_ID
[ -z "$ACCOUNT_ID" ] && { echo "❌ Account ID required"; exit 1; }

PROJECT_NAME="dogotel"
TEMPLATE_BASE_FILE="template.base.json"
TEMPLATE_FILE="template.json"
STACK_NAME="${PROJECT_NAME}-stack"
REGION="us-east-1"
S3_BUCKET_DEPLOY="${PROJECT_NAME}-deploy-bucket-${ACCOUNT_ID}"

####################### TEMPLATE → replace __ACCOUNT_ID__
echo "🛠️  Preparing ${TEMPLATE_FILE} ..."
sed "s|__ACCOUNT_ID__|${ACCOUNT_ID}|g" "${TEMPLATE_BASE_FILE}" > "${TEMPLATE_FILE}"

####################### DEPLOY BUCKET
echo "🪣 Ensuring deploy bucket ${S3_BUCKET_DEPLOY} ..."
aws s3api head-bucket --bucket "${S3_BUCKET_DEPLOY}" 2>/dev/null \
  || aws s3 mb "s3://${S3_BUCKET_DEPLOY}" --region "${REGION}"

####################### samconfig – unique Cognito domain
UNIQUE_DOMAIN="${PROJECT_NAME}-auth-$(date +%s)"
cat > samconfig.toml <<EOF
version = 0.1
[default]
  [default.deploy.parameters]
  stack_name           = "${STACK_NAME}"
  s3_bucket            = "${S3_BUCKET_DEPLOY}"
  region               = "${REGION}"
  confirm_changeset    = false
  capabilities         = "CAPABILITY_IAM CAPABILITY_AUTO_EXPAND"
  parameter_overrides  = "ProjectName=${PROJECT_NAME} CognitoDomainPrefix=${UNIQUE_DOMAIN}"
EOF

####################### PREPARE ROOM DATA
echo "📊 Preparing room data for Lambda package..."
# Generate room data with S3 URLs
node prepare_room_data.js "$ACCOUNT_ID"

# Copy room data to the handlers directory so it's included in the Lambda package
if [ -f "room_data.json" ]; then
    cp room_data.json src/handlers/
    echo "✅ Room data copied to Lambda package"
else
    echo "⚠️ Warning: Room data file not found"
fi

####################### BUILD & DEPLOY
echo "🔨 Building SAM application..."
sam build --template "${TEMPLATE_FILE}"
echo "🚀 Deploying to AWS..."
sam deploy --config-file samconfig.toml --no-confirm-changeset --no-fail-on-empty-changeset

# Clean up temporary files
rm -f room_data.json src/handlers/room_data.json

####################### FETCH OUTPUTS (using AWS CLI without jq)
echo "🔍 Fetching outputs..."

# Get outputs using AWS CLI and grep/sed instead of jq
API_URL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" \
          --query "Stacks[0].Outputs[?OutputKey=='DogotelApiUrl'].OutputValue" --output text)
IMAGES_BUCKET=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" \
                --query "Stacks[0].Outputs[?OutputKey=='ImagesBucketName'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" \
               --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" \
            --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolClientId'].OutputValue" --output text)

if [[ -z "${API_URL}" ]]; then
  echo "⚠️  DogotelApiUrl output missing. Check the stack for errors."
  exit 1
fi

####################### CORS on images bucket
if [[ -n "${IMAGES_BUCKET}" ]]; then
  echo "🪣 Setting CORS on ${IMAGES_BUCKET} ..."
  CORS=$(cat <<JSON
{ "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT","POST","GET"],
    "AllowedOrigins": ["*"]
}]}
JSON
  )
  aws s3api put-bucket-cors --bucket "${IMAGES_BUCKET}" --cors-configuration "${CORS}"
fi

####################### GENERATE FRONTEND CONFIG
echo "📝 Generating frontend config..."

# Calculate all config values
WEBSITE_BUCKET="${PROJECT_NAME}-website-${ACCOUNT_ID}"
COGNITO_HOSTED_UI_URL="https://${UNIQUE_DOMAIN}.auth.${REGION}.amazoncognito.com"
REDIRECT_URL="http://${WEBSITE_BUCKET}.s3-website-${REGION}.amazonaws.com"
IMAGE_BASE_URL="https://${IMAGES_BUCKET}.s3.amazonaws.com/images/"

# Replace placeholders in config.js with actual values
sed -i.bak \
  -e "s|__API_URL__|${API_URL}|g" \
  -e "s|__COGNITO_USER_POOL_ID__|${USER_POOL_ID}|g" \
  -e "s|__COGNITO_CLIENT_ID__|${CLIENT_ID}|g" \
  -e "s|__S3_BUCKET_NAME__|${IMAGES_BUCKET}|g" \
  -e "s|__IMAGE_BASE_URL__|${IMAGE_BASE_URL}|g" \
  -e "s|__COGNITO_HOSTED_UI_URL__|${COGNITO_HOSTED_UI_URL}|g" \
  -e "s|__REDIRECT_URL__|${REDIRECT_URL}|g" \
  "../dogotel-frontend/src/config.js"

rm -f "../dogotel-frontend/src/config.js.bak"

####################### SUMMARY WITH ALL CONFIG VALUES
echo -e "\n✅ Part 1 (Backend Deployment) complete!"
echo ""
echo "🔧 Backend Resources:"
printf "   API URL:          %s\n" "${API_URL}"
printf "   Images bucket:    %s\n" "${IMAGES_BUCKET}"
printf "   Cognito UserPool: %s\n" "${USER_POOL_ID}"
printf "   Cognito Client:   %s\n" "${CLIENT_ID}"
echo ""
echo "🔧 Frontend Config Values (for manual reference):"
printf "   API_URL:                  %s\n" "${API_URL}"
printf "   COGNITO_USER_POOL_ID:     %s\n" "${USER_POOL_ID}"
printf "   COGNITO_CLIENT_ID:        %s\n" "${CLIENT_ID}"
printf "   REGION:                   %s\n" "${REGION}"
printf "   S3_BUCKET_NAME:           %s\n" "${IMAGES_BUCKET}"
printf "   IMAGE_BASE_URL:           %s\n" "${IMAGE_BASE_URL}"
printf "   COGNITO_HOSTED_UI_URL:    %s\n" "${COGNITO_HOSTED_UI_URL}"
printf "   REDIRECT_URL:             %s\n" "${REDIRECT_URL}"
echo ""
echo "📁 Frontend config updated at: ../dogotel-frontend/src/config.js"
echo "🚀 Ready for Part 2 (Frontend Upload)!" 