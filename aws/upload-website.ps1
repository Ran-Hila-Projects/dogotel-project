# Dogotel Website Upload Script for S3
# This script uploads website files to the S3 bucket created during SAM deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$StackName = "dogotel-stack",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$SourcePath = "../dogotel-frontend",
    
    [Parameter(Mandatory=$false)]
    [string]$ConfigFile = "deployment-config.json"
)

Write-Host "=== Dogotel Website Upload Script ===" -ForegroundColor Green
Write-Host "Stack Name: $StackName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Source Path: $SourcePath" -ForegroundColor Yellow
Write-Host ""

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✓ AWS CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI is not installed. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Check AWS credentials
try {
    $caller = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✓ AWS credentials are configured" -ForegroundColor Green
    Write-Host "  Account: $($caller.Account)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ AWS credentials are not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Get bucket name from stack outputs or config file
$bucketName = $null

# Try to get from deployment config file first
if (Test-Path $ConfigFile) {
    try {
        $config = Get-Content $ConfigFile | ConvertFrom-Json
        $bucketName = $config.bucketName
        Write-Host "✓ Found bucket name in config file: $bucketName" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not read config file, will try CloudFormation..." -ForegroundColor Yellow
    }
}

# If not found in config, get from CloudFormation
if (-not $bucketName) {
    try {
        Write-Host "Retrieving bucket name from CloudFormation stack..." -ForegroundColor Yellow
        $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
        $bucketName = ($outputs | Where-Object { $_.OutputKey -eq "WebsiteBucketName" }).OutputValue
        
        if (-not $bucketName) {
            throw "Bucket name not found in stack outputs"
        }
        
        Write-Host "✓ Found bucket name from CloudFormation: $bucketName" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to retrieve bucket name: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please ensure the CloudFormation stack '$StackName' exists and has been deployed successfully." -ForegroundColor Red
        exit 1
    }
}

# Check if source directory exists
if (-not (Test-Path $SourcePath)) {
    Write-Host "⚠ Source directory '$SourcePath' does not exist." -ForegroundColor Yellow
    Write-Host "Creating a simple placeholder website..." -ForegroundColor Yellow
    
    # Create a simple placeholder website
    $placeholderDir = "placeholder-website"
    if (-not (Test-Path $placeholderDir)) {
        New-Item -ItemType Directory -Path $placeholderDir | Out-Null
    }
    
    # Create index.html
    $indexHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dogotel - Dog Boarding Service</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
            border: 1px solid rgba(255, 255, 255, 0.18);
            max-width: 800px;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .api-info {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            padding: 1.5rem;
            margin: 2rem 0;
            text-align: left;
        }
        .endpoint {
            font-family: 'Courier New', monospace;
            background: rgba(0, 0, 0, 0.3);
            padding: 0.5rem;
            border-radius: 5px;
            margin: 0.5rem 0;
            word-break: break-all;
        }
        .status {
            color: #4CAF50;
            font-weight: bold;
        }
        .feature-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 1rem;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐕 Dogotel</h1>
        <p class="subtitle">Premium Dog Boarding Service</p>
        <p class="status">✅ API Deployed Successfully!</p>
        
        <div class="feature-list">
            <div class="feature">
                <div class="icon">🏠</div>
                <h3>Room Booking</h3>
                <p>Multiple room types with different amenities</p>
            </div>
            <div class="feature">
                <div class="icon">👤</div>
                <h3>User Management</h3>
                <p>Secure authentication with Cognito</p>
            </div>
            <div class="feature">
                <div class="icon">⭐</div>
                <h3>Reviews</h3>
                <p>Customer feedback and rating system</p>
            </div>
            <div class="feature">
                <div class="icon">📊</div>
                <h3>Admin Dashboard</h3>
                <p>Complete analytics and reporting</p>
            </div>
        </div>
        
        <div class="api-info">
            <h3>🚀 Quick Start</h3>
            <p><strong>1. Initialize Sample Data:</strong></p>
            <div class="endpoint" id="initEndpoint">POST [API_URL]/admin/initialize</div>
            
            <p><strong>2. Sample Credentials:</strong></p>
            <div class="endpoint">Admin: admin@dogotel.com / AdminPass123!</div>
            <div class="endpoint">User: user@example.com / UserPass123!</div>
            
            <p><strong>3. Test Endpoints:</strong></p>
            <div class="endpoint" id="roomsEndpoint">GET [API_URL]/rooms</div>
            <div class="endpoint" id="dashboardEndpoint">GET [API_URL]/admin/dashboard</div>
        </div>
        
        <p><em>This is a placeholder page. Replace with your custom frontend!</em></p>
    </div>
    
    <script>
        // Try to load API URL from config if available
        fetch('deployment-config.json')
            .then(response => response.json())
            .then(config => {
                document.getElementById('initEndpoint').textContent = `POST ${config.apiUrl}/admin/initialize`;
                document.getElementById('roomsEndpoint').textContent = `GET ${config.apiUrl}/rooms`;
                document.getElementById('dashboardEndpoint').textContent = `GET ${config.apiUrl}/admin/dashboard`;
            })
            .catch(() => {
                console.log('No deployment config found, using placeholder URLs');
            });
    </script>
</body>
</html>
"@
    
    $indexHtml | Out-File -FilePath "$placeholderDir/index.html" -Encoding UTF8
    
    # Create error.html
    $errorHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dogotel - Page Not Found</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 600px;
        }
        h1 { font-size: 4rem; margin-bottom: 1rem; }
        h2 { font-size: 2rem; margin-bottom: 1rem; }
        a { color: #FFD700; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐕</h1>
        <h2>Oops! Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <p><a href="/">← Go back to Dogotel home</a></p>
    </div>
</body>
</html>
"@
    
    $errorHtml | Out-File -FilePath "$placeholderDir/error.html" -Encoding UTF8
    
    # Copy deployment config if it exists
    if (Test-Path $ConfigFile) {
        Copy-Item $ConfigFile "$placeholderDir/deployment-config.json"
        Write-Host "✓ Copied deployment config to website" -ForegroundColor Green
    }
    
    $SourcePath = $placeholderDir
    Write-Host "✓ Created placeholder website in '$placeholderDir'" -ForegroundColor Green
}

# Verify bucket exists
try {
    Write-Host "Verifying S3 bucket '$bucketName' exists..." -ForegroundColor Yellow
    aws s3api head-bucket --bucket $bucketName --region $Region 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Bucket does not exist or access denied"
    }
    Write-Host "✓ S3 bucket verified" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to access S3 bucket '$bucketName': $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure the bucket exists and you have proper permissions." -ForegroundColor Red
    exit 1
}

# Upload files to S3
Write-Host ""
Write-Host "Uploading website files to S3..." -ForegroundColor Blue

try {
    # Upload all files recursively
    aws s3 sync $SourcePath s3://$bucketName --region $Region --delete
    
    if ($LASTEXITCODE -ne 0) {
        throw "S3 sync failed"
    }
    
    Write-Host "✓ Website files uploaded successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to upload website files: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Get website URL
try {
    $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    $websiteUrl = ($outputs | Where-Object { $_.OutputKey -eq "WebsiteUrl" }).OutputValue
    
    Write-Host ""
    Write-Host "=== UPLOAD SUCCESSFUL ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 WEBSITE INFORMATION:" -ForegroundColor Cyan
    Write-Host "Website URL: $websiteUrl" -ForegroundColor White
    Write-Host "S3 Bucket: $bucketName" -ForegroundColor White
    Write-Host "Region: $Region" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 FILES UPLOADED:" -ForegroundColor Cyan
    
    # List uploaded files
    $files = aws s3 ls s3://$bucketName --recursive --human-readable --summarize
    Write-Host $files -ForegroundColor White
    
    Write-Host ""
    Write-Host "🚀 NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "1. Visit: $websiteUrl" -ForegroundColor White
    Write-Host "2. Initialize sample data if not done already" -ForegroundColor White
    Write-Host "3. Test the application functionality" -ForegroundColor White
    Write-Host ""
    
    if ($SourcePath -eq "placeholder-website") {
        Write-Host "💡 TIP: Replace the placeholder website with your custom frontend" -ForegroundColor Yellow
        Write-Host "   Place your files in '../dogotel-frontend' or specify custom path with -SourcePath" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Failed to retrieve website URL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== UPLOAD COMPLETE ===" -ForegroundColor Green 