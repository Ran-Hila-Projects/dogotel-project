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
    
    $apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "DogotelApiUrl" }).OutputValue
    $bucketName = ($outputs | Where-Object { $_.OutputKey -eq "ImagesBucketName" }).OutputValue
    $bucketUrl = ($outputs | Where-Object { $_.OutputKey -eq "ImagesBucketUrl" }).OutputValue
    
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
Write-Host "Logout: POST $apiUrl/auth/logout" -ForegroundColor White
Write-Host ""
Write-Host "🏠 ROOM ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Get All Rooms: GET $apiUrl/rooms" -ForegroundColor White
Write-Host "Get Room Details: GET $apiUrl/rooms/{id}" -ForegroundColor White
Write-Host "Get Room Unavailable Dates: GET $apiUrl/rooms/{id}/unavailable-dates" -ForegroundColor White
Write-Host "Get Room Unavailable Ranges: GET $apiUrl/rooms/{id}/unavailable-ranges" -ForegroundColor White
Write-Host "Create Room: POST $apiUrl/rooms" -ForegroundColor White
Write-Host "Update Room: PUT $apiUrl/rooms/{id}" -ForegroundColor White
Write-Host "Delete Room: DELETE $apiUrl/rooms/{id}" -ForegroundColor White
Write-Host ""
Write-Host "📅 BOOKING ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Get All Bookings: GET $apiUrl/bookings" -ForegroundColor White
Write-Host "Get User Bookings: GET $apiUrl/bookings?userId={email}" -ForegroundColor White
Write-Host "Create Booking: POST $apiUrl/bookings" -ForegroundColor White
Write-Host "Get Booking History: GET $apiUrl/bookings/{email}" -ForegroundColor White
Write-Host ""
Write-Host "⭐ REVIEW ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Add Review: POST $apiUrl/rooms/{id}/reviews" -ForegroundColor White
Write-Host ""
Write-Host "🍽️ DINING & SERVICES ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Get Dining Details: GET $apiUrl/dining/{id}" -ForegroundColor White
Write-Host "Get Service Details: GET $apiUrl/services/{id}" -ForegroundColor White
Write-Host ""
Write-Host "👤 USER ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Get User Profile: GET $apiUrl/user/{email}" -ForegroundColor White
Write-Host "Update User Profile: PUT $apiUrl/user/{email}" -ForegroundColor White
Write-Host ""
Write-Host "👨‍💼 ADMIN ENDPOINTS:" -ForegroundColor Cyan
Write-Host "Dashboard: GET $apiUrl/admin/dashboard" -ForegroundColor White
Write-Host "Reports: GET $apiUrl/admin/reports" -ForegroundColor White
Write-Host "Initialize Data: POST $apiUrl/admin/initialize" -ForegroundColor White
Write-Host ""
Write-Host "🖼️ IMAGES STORAGE:" -ForegroundColor Cyan
Write-Host "S3 Bucket: $bucketName" -ForegroundColor White
Write-Host "S3 URL: $bucketUrl" -ForegroundColor White
Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Initialize sample data: POST $apiUrl/admin/initialize" -ForegroundColor White
Write-Host "2. Use upload-website.ps1 to deploy frontend files" -ForegroundColor White
Write-Host "3. Test the API endpoints with the provided URLs" -ForegroundColor White
Write-Host ""
Write-Host "📋 TEST THE APIS:" -ForegroundColor Cyan
Write-Host "curl -X GET $apiUrl/rooms" -ForegroundColor White
Write-Host "curl -X POST $apiUrl/admin/initialize" -ForegroundColor White
Write-Host ""

# Save configuration to file for frontend
$config = @{
    apiUrl = $apiUrl
    bucketName = $bucketName
    bucketUrl = $bucketUrl
    region = $Region
} | ConvertTo-Json -Depth 2

$config | Out-File -FilePath "deployment-config.json" -Encoding UTF8
Write-Host "✓ Configuration saved to deployment-config.json" -ForegroundColor Green
Write-Host ""

Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Stack Name: $StackName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""
Write-Host "To initialize sample data, run:" -ForegroundColor Cyan
Write-Host "curl -X POST $apiUrl/admin/initialize" -ForegroundColor White 