# Dogotel SAM Deployment Script for AWS Academy Learner Lab
# This script deploys the Dogotel infrastructure using AWS SAM

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$StackName = "dogotel-stack",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "=== Dogotel SAM Deployment Script ===" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Stack Name: $StackName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✓ AWS CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI is not installed. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Check if SAM CLI is installed
try {
    sam --version | Out-Null
    Write-Host "✓ SAM CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ SAM CLI is not installed. Please install SAM CLI first." -ForegroundColor Red
    exit 1
}

# Check AWS credentials
try {
    $caller = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✓ AWS credentials are configured" -ForegroundColor Green
    Write-Host "  Account: $($caller.Account)" -ForegroundColor Cyan
    Write-Host "  User/Role: $($caller.Arn)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ AWS credentials are not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting SAM deployment..." -ForegroundColor Blue

# Build the SAM application
Write-Host "Step 1: Building SAM application..." -ForegroundColor Yellow
try {
    sam build
    if ($LASTEXITCODE -ne 0) {
        throw "SAM build failed"
    }
    Write-Host "✓ SAM build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ SAM build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Deploy the SAM application
Write-Host "Step 2: Deploying SAM application..." -ForegroundColor Yellow
try {
    sam deploy --guided --stack-name $StackName --region $Region --parameter-overrides Environment=$Environment --capabilities CAPABILITY_IAM
    if ($LASTEXITCODE -ne 0) {
        throw "SAM deploy failed"
    }
    Write-Host "✓ SAM deployment completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ SAM deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Get stack outputs
Write-Host "Step 3: Retrieving deployment information..." -ForegroundColor Yellow
try {
    $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    
    $apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiUrl" }).OutputValue
    $websiteUrl = ($outputs | Where-Object { $_.OutputKey -eq "WebsiteUrl" }).OutputValue
    $bucketName = ($outputs | Where-Object { $_.OutputKey -eq "WebsiteBucketName" }).OutputValue
    $userPoolId = ($outputs | Where-Object { $_.OutputKey -eq "CognitoUserPoolId" }).OutputValue
    $clientId = ($outputs | Where-Object { $_.OutputKey -eq "CognitoClientId" }).OutputValue
    $deployedRegion = ($outputs | Where-Object { $_.OutputKey -eq "Region" }).OutputValue
    
    Write-Host "✓ Deployment information retrieved successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to retrieve deployment information: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Display deployment results
Write-Host "=== DEPLOYMENT SUCCESSFUL ===" -ForegroundColor Green
Write-Host ""
Write-Host "📊 DOGOTEL API ENDPOINTS:" -ForegroundColor Cyan
Write-Host "API Base URL: $apiUrl" -ForegroundColor White
Write-Host ""
Write-Host "🔐 AUTHENTICATION ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Register: POST $apiUrl/auth/register" -ForegroundColor White
Write-Host "Login: POST $apiUrl/auth/login" -ForegroundColor White
Write-Host ""
Write-Host "🏠 ROOM ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Get Rooms: GET $apiUrl/rooms" -ForegroundColor White
Write-Host "Get Room: GET $apiUrl/rooms/{room_id}" -ForegroundColor White
Write-Host "Create Room (Admin): POST $apiUrl/admin/rooms" -ForegroundColor White
Write-Host ""
Write-Host "📅 BOOKING ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Create Booking: POST $apiUrl/bookings" -ForegroundColor White
Write-Host "Get My Bookings: GET $apiUrl/bookings" -ForegroundColor White
Write-Host "Cancel Booking: DELETE $apiUrl/bookings/{booking_id}" -ForegroundColor White
Write-Host ""
Write-Host "⭐ REVIEW ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Get Room Reviews: GET $apiUrl/rooms/{room_id}/reviews" -ForegroundColor White
Write-Host "Create Review: POST $apiUrl/reviews" -ForegroundColor White
Write-Host ""
Write-Host "👨‍💼 ADMIN ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Dashboard: GET $apiUrl/admin/dashboard" -ForegroundColor White
Write-Host "Reports: GET $apiUrl/admin/reports?type=revenue&period=30d" -ForegroundColor White
Write-Host "All Bookings: GET $apiUrl/admin/bookings" -ForegroundColor White
Write-Host "All Reviews: GET $apiUrl/admin/reviews" -ForegroundColor White
Write-Host ""
Write-Host "🌐 WEBSITE INFORMATION:" -ForegroundColor Cyan
Write-Host "Website URL: $websiteUrl" -ForegroundColor White
Write-Host "S3 Bucket: $bucketName" -ForegroundColor White
Write-Host ""
Write-Host "🔑 COGNITO CONFIGURATION:" -ForegroundColor Cyan
Write-Host "User Pool ID: $userPoolId" -ForegroundColor White
Write-Host "Client ID: $clientId" -ForegroundColor White
Write-Host "Region: $deployedRegion" -ForegroundColor White
Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Initialize sample data: POST $apiUrl/admin/initialize" -ForegroundColor White
Write-Host "2. Use upload-website.ps1 to deploy frontend files" -ForegroundColor White
Write-Host "3. Test the API endpoints with the provided URLs" -ForegroundColor White
Write-Host ""
Write-Host "📋 SAMPLE CREDENTIALS (after initialization):" -ForegroundColor Cyan
Write-Host "Admin: admin@dogotel.com / AdminPass123!" -ForegroundColor White
Write-Host "User: user@example.com / UserPass123!" -ForegroundColor White
Write-Host ""

# Save configuration to file for frontend
$config = @{
    apiUrl = $apiUrl
    userPoolId = $userPoolId
    clientId = $clientId
    region = $deployedRegion
    bucketName = $bucketName
    websiteUrl = $websiteUrl
} | ConvertTo-Json -Depth 2

$config | Out-File -FilePath "deployment-config.json" -Encoding UTF8
Write-Host "✓ Configuration saved to deployment-config.json" -ForegroundColor Green
Write-Host ""

Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Stack Name: $StackName" -ForegroundColor Yellow
Write-Host "Region: $deployedRegion" -ForegroundColor Yellow
Write-Host ""
Write-Host "To initialize sample data, run:" -ForegroundColor Cyan
Write-Host "curl -X POST $apiUrl/admin/initialize" -ForegroundColor White 