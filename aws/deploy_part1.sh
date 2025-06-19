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

####################### BUILD & DEPLOY
sam build --template "${TEMPLATE_FILE}"
sam deploy --config-file samconfig.toml --no-confirm-changeset --no-fail-on-empty-changeset

####################### FETCH OUTPUTS
echo "🔍 Fetching outputs..."
OUTPUTS=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" \
          --query "Stacks[0].Outputs" --output json)

# Get outputs
API_URL=$(echo "${OUTPUTS}" | jq -r '.[]|select(.OutputKey=="DogotelApiUrl")|.OutputValue')
IMAGES_BUCKET=$(echo "${OUTPUTS}" | jq -r '.[]|select(.OutputKey=="ImagesBucketName")|.OutputValue')
USER_POOL_ID=$(echo "${OUTPUTS}" | jq -r '.[]|select(.OutputKey=="CognitoUserPoolId")|.OutputValue')
CLIENT_ID=$(echo "${OUTPUTS}" | jq -r '.[]|select(.OutputKey=="CognitoUserPoolClientId")|.OutputValue')

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
cat > ../dogotel-frontend/config.js <<EOF
const CONFIG = {
  API_URL: "${API_URL}",
  REGION: "${REGION}",
  S3_BUCKET_NAME: "${IMAGES_BUCKET}",
  IMAGE_BASE_URL: "https://${IMAGES_BUCKET}.s3.amazonaws.com/images/",
  COGNITO_USER_POOL_ID: "${USER_POOL_ID}",
  COGNITO_USER_POOL_CLIENT_ID: "${CLIENT_ID}"
};

export default CONFIG;
EOF

####################### SUMMARY
echo -e "\n✅ Part 1 (Backend Deployment) complete!"
printf "API URL:             %s\n" "${API_URL}"
printf "Images bucket:       %s\n" "${IMAGES_BUCKET}"
printf "Cognito UserPool:    %s\n" "${USER_POOL_ID}"
printf "Cognito Client:      %s\n" "${CLIENT_ID}"
echo ""
echo "📁 Frontend config generated at: ../dogotel-frontend/config.js"
echo "🚀 Ready for Part 2 (Frontend Upload)!" 