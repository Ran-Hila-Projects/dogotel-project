## 🚀 Installation & Setup

### Prerequisites

- **Node.js** (v14 or higher) and npm
- **AWS CLI** configured with appropriate permissions
- **AWS Account** with access to:
  - Lambda, API Gateway, DynamoDB, S3, Cognito, SES
  - Proper IAM roles and policies
- **Git** for cloning the repository

### Frontend Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd dogotel-project
   ```

2. **Install frontend dependencies:**
   ```bash
   cd dogotel-frontend
   npm install
   ```

3. **Configure the application:**
   - Update `src/config.js` with your AWS API Gateway URLs and Cognito details
   - Ensure all API endpoints match your deployed backend

4. **Run the development server:**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`

### AWS Backend Deployment

1. **Navigate to the AWS directory:**
   ```bash
   cd ../aws
   ```

2. **Make deployment scripts executable:**
   ```bash
   chmod +x chmod.sh deploy_part1.sh deploy_part2.sh
   ./chmod.sh
   ```

3. **Prepare room data:**
   ```bash
   node prepare_room_data.js
   ```

4. **Deploy the backend infrastructure:**
   ```bash
   ./deploy_part1.sh
   ./deploy_part2.sh
   ```

### AWS Services Configuration

1. **Amazon Cognito:**
   - Create a User Pool for authentication
   - Configure App Client settings
   - Set up user groups (users and admins)

2. **Amazon S3:**
   - Create buckets for static hosting and image storage
   - Configure bucket policies for public read access

3. **Amazon DynamoDB:**
   - Tables will be created automatically during deployment
   - Ensure proper read/write capacity settings

4. **Amazon SES:**
   - Verify your sending domain/email address
   - Configure email templates for booking confirmations

5. **API Gateway:**
   - Configure CORS settings
   - Set up proper authentication and authorization

### Production Deployment

1. **Build the frontend for production:**
   ```bash
   cd dogotel-frontend
   npm run build
   ```

2. **Deploy to S3:**
   - Upload the `build/` folder contents to your S3 bucket
   - Configure S3 bucket for static website hosting

3. **Update configuration:**
   - Ensure all API endpoints in `config.js` point to production URLs
   - Verify CORS settings allow your domain

### Environment Variables

Create appropriate configuration files with:
- AWS region settings
- API Gateway URLs
- Cognito User Pool IDs and App Client IDs
- S3 bucket names
- DynamoDB table names