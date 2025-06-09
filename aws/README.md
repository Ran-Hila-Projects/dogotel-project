# 🐕 Dogotel - Cloud-Native Dog Boarding Service

A comprehensive dog boarding web application built for AWS Academy Learner Lab environment using serverless architecture.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Cost Optimization](#cost-optimization)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🏗️ Overview

Dogotel is a cloud-native dog boarding service that provides:

- **User Management**: Secure registration and authentication via AWS Cognito
- **Room Booking**: Multiple room types with different pricing and amenities
- **Review System**: Customer feedback and rating system with admin moderation
- **Admin Dashboard**: Comprehensive analytics and reporting
- **Responsive Design**: Works on desktop and mobile devices

### Built for AWS Academy Learner Lab

This project is specifically optimized for AWS Academy Learner Lab constraints:
- ✅ Limited service availability
- ✅ PAY_PER_REQUEST billing mode
- ✅ Cost-conscious design patterns

## 🏛️ Architecture

### Serverless Architecture Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   S3 Website    │    │   API Gateway    │    │   Lambda Funcs  │
│   Static Host   │◄──►│   REST API       │◄──►│   6 Handlers    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Cognito User    │    │   DynamoDB      │
                       │      Pool        │    │   4 Tables      │
                       └──────────────────┘    └─────────────────┘
```

### AWS Services Used

- **AWS Lambda**: 6 serverless functions for business logic
- **Amazon API Gateway**: RESTful API with Cognito authorization
- **Amazon DynamoDB**: NoSQL database with 4 tables
- **Amazon Cognito**: User authentication and authorization
- **Amazon S3**: Static website hosting
- **Amazon SNS**: Notification system (POC level)
- **AWS CloudFormation**: Infrastructure as Code via SAM

### Database Schema

#### Tables Structure
- **Users**: User profiles and authentication data
- **Rooms**: Room information, pricing, and availability
- **Bookings**: Reservation records and status
- **Reviews**: Customer feedback and ratings

## ✨ Features

### User Features
- 🔐 **Secure Authentication**: Email/password with Cognito
- 🏠 **Room Browsing**: Filter by type, price, and dates
- 📅 **Booking Management**: Create, view, and cancel reservations
- ⭐ **Reviews**: Rate and review stays
- 📱 **Responsive Design**: Mobile-friendly interface

### Admin Features
- 📊 **Dashboard**: Overview of bookings, revenue, and occupancy
- 📈 **Reports**: Revenue, occupancy, and customer analytics
- 🏠 **Room Management**: Add, edit, and manage room inventory
- 📝 **Review Moderation**: Approve/reject customer reviews
- 👥 **User Management**: View customer information

### Room Types
- **Economy**: Budget-friendly options ($20-25/night)
- **Standard**: Comfortable accommodations ($35-55/night)
- **Luxury**: Premium suites with extra amenities ($85-120/night)

## 🛠️ Prerequisites

### Required Software
- **AWS CLI**: v2.0 or later
- **SAM CLI**: v1.0 or later
- **PowerShell**: v5.0 or later (Windows)
- **Git**: For version control

### AWS Academy Learner Lab Setup
1. Start your AWS Academy Learner Lab
2. Click "AWS CLI" to get credentials
3. Configure AWS CLI with provided credentials:
   ```bash
   aws configure
   ```

### Installation Commands
```bash
# Install AWS CLI (Windows)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Install SAM CLI (Windows)
msiexec.exe /i https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi

# Verify installations
aws --version
sam --version
```

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd dogotel-project/aws
```

### 2. Deploy Infrastructure
```powershell
# Run the SAM deployment script
.\deploy-sam.ps1
```

### 3. Initialize Sample Data
```bash
# Use the API URL from deployment output
curl -X POST https://your-api-url/dev/admin/initialize
```

### 4. Upload Website
```powershell
# Upload placeholder website to S3
.\upload-website.ps1
```

### 5. Access the Application
- **Website**: Use the S3 website URL from deployment output
- **API**: Use the API Gateway URL for direct API access

## 📦 Deployment

### Deployment Scripts

#### 1. SAM Deployment (`deploy-sam.ps1`)
Deploys the entire AWS infrastructure using CloudFormation.

**Usage:**
```powershell
.\deploy-sam.ps1 -Environment dev -StackName dogotel-stack -Region us-east-1
```

**What it does:**
- ✅ Validates AWS CLI and SAM CLI installation
- ✅ Checks AWS credentials
- ✅ Builds and deploys SAM application
- ✅ Creates all AWS resources
- ✅ Displays API endpoints and configuration
- ✅ Saves configuration to `deployment-config.json`

#### 2. Website Upload (`upload-website.ps1`)
Uploads website files to the S3 bucket.

**Usage:**
```powershell
.\upload-website.ps1 -StackName dogotel-stack -SourcePath "../dogotel-frontend"
```

**What it does:**
- ✅ Retrieves S3 bucket name from CloudFormation
- ✅ Creates placeholder website if source doesn't exist
- ✅ Uploads files to S3 with proper permissions
- ✅ Provides website URL and next steps

### Manual Deployment Steps

If you prefer manual deployment:

1. **Build SAM application:**
   ```bash
   sam build
   ```

2. **Deploy with guided setup:**
   ```bash
   sam deploy --guided
   ```

3. **Initialize data:**
   ```bash
   curl -X POST https://your-api-url/dev/admin/initialize
   ```

## 📚 API Documentation

### Base URL
```
https://{api-id}.execute-api.{region}.amazonaws.com/dev
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1-555-0123",
  "role": "USER"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Room Endpoints

#### Get All Rooms
```http
GET /rooms?type=Standard&min_price=30&max_price=100&check_in=2024-01-15&check_out=2024-01-17
```

#### Get Room Details
```http
GET /rooms/{room_id}
Authorization: Bearer {token}
```

### Booking Endpoints

#### Create Booking
```http
POST /bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "room_id": "room-uuid",
  "check_in_date": "2024-01-15T15:00:00Z",
  "check_out_date": "2024-01-17T11:00:00Z",
  "number_of_dogs": 1,
  "special_requests": "Extra toys please"
}
```

#### Get My Bookings
```http
GET /bookings
Authorization: Bearer {token}
```

#### Cancel Booking
```http
DELETE /bookings/{booking_id}
Authorization: Bearer {token}
```

### Review Endpoints

#### Get Room Reviews
```http
GET /rooms/{room_id}/reviews
```

#### Create Review
```http
POST /reviews
Authorization: Bearer {token}
Content-Type: application/json

{
  "room_id": "room-uuid",
  "booking_id": "booking-uuid",
  "rating": 5,
  "comment": "Excellent service!"
}
```

### Admin Endpoints

#### Admin Dashboard
```http
GET /admin/dashboard
Authorization: Bearer {admin-token}
```

#### Generate Reports
```http
GET /admin/reports?type=revenue&period=30d
Authorization: Bearer {admin-token}
```

#### Get All Bookings
```http
GET /admin/bookings
Authorization: Bearer {admin-token}
```

#### Moderate Review
```http
PUT /admin/reviews/{review_id}/moderate
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "status": "approved"
}
```

### System Endpoints

#### Initialize Sample Data
```http
POST /admin/initialize
```

## 🧪 Testing

### Sample Credentials
After running the initialize script:

- **Admin**: `admin@dogotel.com` / `AdminPass123!`
- **User**: `user@example.com` / `UserPass123!`

### Test Scenarios

#### 1. User Registration and Login
```bash
# Register new user
curl -X POST https://your-api-url/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","first_name":"Test","last_name":"User","phone":"+1-555-0789","role":"USER"}'

# Login
curl -X POST https://your-api-url/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

#### 2. Browse Rooms
```bash
# Get all rooms
curl https://your-api-url/dev/rooms

# Filter rooms
curl "https://your-api-url/dev/rooms?type=Standard&min_price=30&max_price=60"
```

#### 3. Create Booking
```bash
# Create booking (replace {token} with JWT from login)
curl -X POST https://your-api-url/dev/bookings \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"room_id":"room-uuid","check_in_date":"2024-01-15T15:00:00Z","check_out_date":"2024-01-17T11:00:00Z","number_of_dogs":1}'
```

#### 4. Admin Dashboard
```bash
# Get dashboard data (replace {admin-token} with admin JWT)
curl -X GET https://your-api-url/dev/admin/dashboard \
  -H "Authorization: Bearer {admin-token}"
```

### Postman Collection
A Postman collection is available for comprehensive API testing. Import the provided collection and set up environment variables for your API URL and tokens.

## 💰 Cost Optimization

### AWS Academy Learner Lab Considerations

This project is designed to minimize costs within the $100 budget limit:

#### Cost-Saving Features
- ✅ **PAY_PER_REQUEST** DynamoDB billing
- ✅ **On-demand** Lambda pricing
- ✅ **Free tier** API Gateway usage
- ✅ **Static website** hosting on S3
- ✅ **Minimal data storage** requirements

#### Estimated Monthly Costs
- **DynamoDB**: $1-5 (PAY_PER_REQUEST)
- **Lambda**: $0-2 (free tier covers most usage)
- **API Gateway**: $0-3 (first 1M requests free)
- **S3**: $0-1 (minimal storage)
- **Cognito**: $0 (free tier covers 50k users)
- **Total**: **$1-11 per month**

#### Cost Monitoring
- Monitor usage in AWS Cost Explorer
- Set up billing alerts for $10-20 thresholds
- Delete stack when not needed: `sam delete`

## 🔧 Troubleshooting

### Common Issues

#### 1. SAM Build Failures
```bash
# Clear SAM cache
rm -rf .aws-sam/

# Rebuild
sam build --use-container
```

#### 2. Deployment Permission Errors
- Ensure AWS Academy Learner Lab is started
- Refresh AWS credentials from lab environment
- Check IAM permissions for CloudFormation

#### 3. API Gateway 403 Errors
- Verify Cognito authentication is working
- Check JWT token expiration
- Ensure proper role (USER/ADMIN) for endpoints

#### 4. DynamoDB Errors
- Check table names in environment variables
- Verify IAM policies for Lambda functions
- Monitor CloudWatch logs for detailed errors

#### 5. S3 Website Access Issues
- Verify bucket policy allows public read
- Check S3 website configuration
- Ensure files are uploaded correctly

### Debug Commands

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name dogotel-stack

# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/dogotel

# Test DynamoDB connection
aws dynamodb list-tables

# Check Cognito user pool
aws cognito-idp list-user-pools --max-results 60
```

### Log Analysis
Monitor CloudWatch logs for each Lambda function:
- `/aws/lambda/dogotel-auth-dev`
- `/aws/lambda/dogotel-rooms-dev`
- `/aws/lambda/dogotel-bookings-dev`
- `/aws/lambda/dogotel-reviews-dev`
- `/aws/lambda/dogotel-admin-dashboard-dev`
- `/aws/lambda/dogotel-admin-reports-dev`

## 📁 Project Structure

```
aws/
├── src/handlers/               # Lambda function handlers
│   ├── auth_handler.py        # Authentication and user management
│   ├── rooms_handler.py       # Room CRUD operations
│   ├── bookings_handler.py    # Booking management
│   ├── reviews_handler.py     # Review system
│   ├── admin_dashboard_handler.py  # Dashboard analytics
│   ├── admin_reports_handler.py    # Report generation
│   └── initialize_data_handler.py  # Sample data creation
├── template.yaml              # SAM template (Infrastructure as Code)
├── deploy-sam.ps1            # SAM deployment script
├── upload-website.ps1        # Website upload script
├── README.md                 # This file
└── deployment-config.json    # Generated configuration file
```

## 🤝 Contributing

### Development Guidelines
1. Follow AWS Well-Architected Framework principles
2. Maintain cost-consciousness for educational environments
3. Include comprehensive error handling and logging
4. Write clear documentation and comments
5. Test thoroughly in AWS Academy Learner Lab

### Code Standards
- **Python**: Follow PEP 8 style guide
- **PowerShell**: Use approved verbs and proper formatting
- **YAML**: Maintain consistent indentation and structure
- **JSON**: Validate all JSON payloads

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Test changes in AWS Academy Learner Lab
4. Submit pull request with detailed description
5. Include cost impact analysis for changes

## 📞 Support

### Resources
- **AWS Academy Documentation**: Course materials and guides
- **AWS SAM Documentation**: https://docs.aws.amazon.com/serverless-application-model/
- **AWS Lambda Documentation**: https://docs.aws.amazon.com/lambda/
- **AWS DynamoDB Documentation**: https://docs.aws.amazon.com/dynamodb/

### Community
- AWS Academy student forums
- Stack Overflow with `aws-sam` and `aws-lambda` tags
- AWS Community forums

---

## 📜 License

This project is created for educational purposes as part of AWS Academy coursework. Please refer to your institution's guidelines for usage and distribution.

---

**🐕 Happy dog boarding with Dogotel!** 

*Built with ❤️ for AWS Academy Learner Lab* 