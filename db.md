# 🗄️ Dogotel Database Architecture

This document explains the data storage architecture for Dogotel, including what's stored in **AWS Cognito** vs **Amazon DynamoDB**, table structures, relationships, and design decisions.

## 📊 **Data Storage Overview**

Dogotel uses a **hybrid data storage approach** combining:
- **AWS Cognito** for authentication and identity management
- **Amazon DynamoDB** for application data and business logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOGOTEL DATA ARCHITECTURE                    │
├─────────────────────────────┬───────────────────────────────────┤
│         AWS COGNITO         │          AMAZON DYNAMODB          │
│     (Authentication)        │        (Application Data)         │
├─────────────────────────────┼───────────────────────────────────┤
│ • User Authentication       │ • Business Logic Data            │
│ • Password Management       │ • Relationships                   │
│ • JWT Token Generation      │ • Complex Queries                 │
│ • Basic User Attributes     │ • Application State               │
│ • Role-Based Access         │ • Booking History                 │
│ • Session Management        │ • Detailed User Profiles         │
└─────────────────────────────┴───────────────────────────────────┘
```

---

## 🔐 **AWS Cognito - Authentication Layer**

### **What's Stored in Cognito:**

#### **User Pool Configuration:**
- **User Pool Name**: `dogotel-users-{environment}`
- **Auto-Verified Attributes**: Email
- **Authentication Flows**: Username/Password, SRP, Refresh Token

#### **User Attributes:**
| **Attribute** | **Type** | **Required** | **Purpose** |
|---------------|----------|--------------|-------------|
| `email` | String | ✅ Yes | Primary username for login |
| `name` | String | ✅ Yes | User's full name |
| `custom:role` | String | ❌ No | User role (USER/ADMIN) |
| `email_verified` | Boolean | Auto | Email verification status |
| `password` | Hashed | ✅ Yes | Securely stored password |

#### **Sample Cognito User Record:**
```json
{
  "Username": "user@example.com",
  "UserAttributes": [
    {
      "Name": "email",
      "Value": "user@example.com"
    },
    {
      "Name": "name", 
      "Value": "John Doe"
    },
    {
      "Name": "custom:role",
      "Value": "USER"
    },
    {
      "Name": "email_verified",
      "Value": "true"
    }
  ],
  "UserStatus": "CONFIRMED",
  "Enabled": true
}
```

#### **Cognito Responsibilities:**
- ✅ **Password Authentication**: Secure password hashing and verification
- ✅ **JWT Token Generation**: Access tokens, ID tokens, refresh tokens  
- ✅ **Session Management**: Token expiration and refresh
- ✅ **Role-Based Access**: Custom role attribute for authorization
- ✅ **Account Security**: Password policies, account lockout

---

## 🏗️ **Amazon DynamoDB - Application Data Layer**

### **Table Structure Overview:**

| **Table** | **Primary Key** | **GSI** | **Purpose** |
|-----------|----------------|---------|-------------|
| **Users** | `user_id` | `EmailIndex` | Extended user profiles |
| **Rooms** | `room_id` | None | Room inventory and details |
| **Bookings** | `booking_id` | `UserBookingsIndex`<br>`RoomBookingsIndex` | Reservation records |
| **Reviews** | `review_id` | `RoomReviewsIndex` | Customer feedback |

---

### **1. 👥 Users Table**

**Table Name**: `dogotel-users-{environment}`

#### **Purpose:**
Extended user profile data that supplements Cognito authentication.

#### **Schema:**
```yaml
Primary Key: user_id (String)
Global Secondary Index: EmailIndex (email)
Billing Mode: PAY_PER_REQUEST
```

#### **Attributes:**
| **Attribute** | **Type** | **Required** | **Description** |
|---------------|----------|--------------|-----------------|
| `user_id` | String (PK) | ✅ | Unique user identifier (UUID) |
| `email` | String (GSI) | ✅ | User email (matches Cognito) |
| `first_name` | String | ✅ | User's first name |
| `last_name` | String | ✅ | User's last name |
| `phone` | String | ❌ | Contact phone number |
| `role` | String | ✅ | USER or ADMIN |
| `created_at` | String | ✅ | ISO timestamp of account creation |
| `updated_at` | String | ✅ | ISO timestamp of last update |
| `is_active` | Boolean | ✅ | Account status flag |

#### **Sample Record:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "john.doe@example.com",
  "first_name": "John",
  "last_name": "Doe", 
  "phone": "+1-555-0123",
  "role": "USER",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "is_active": true
}
```

#### **Query Patterns:**
- **Get user by ID**: `user_id = "123e4567..."`
- **Get user by email**: GSI query on `EmailIndex` with `email = "john@example.com"`

---

### **2. 🏠 Rooms Table**

**Table Name**: `dogotel-rooms-{environment}`

#### **Purpose:**
Room inventory, pricing, amenities, and availability status.

#### **Schema:**
```yaml
Primary Key: room_id (String)
Billing Mode: PAY_PER_REQUEST
Stream: NEW_AND_OLD_IMAGES (for change tracking)
```

#### **Attributes:**
| **Attribute** | **Type** | **Description** |
|---------------|----------|-----------------|
| `room_id` | String (PK) | Unique room identifier (UUID) |
| `name` | String | Room display name |
| `type` | String | Economy, Standard, Luxury |
| `description` | String | Detailed room description |
| `capacity` | Number | Maximum number of dogs |
| `price_per_night` | Decimal | Nightly rate in USD |
| `amenities` | List | Array of amenity strings |
| `size_sqft` | Number | Room size in square feet |
| `available` | Boolean | Availability status |
| `images` | List | Array of image URLs |
| `created_at` | String | ISO timestamp |
| `updated_at` | String | ISO timestamp |

#### **Sample Record:**
```json
{
  "room_id": "room-456e7890-e89b-12d3-a456-426614174001",
  "name": "Luxury Palace Suite",
  "type": "Luxury",
  "description": "Premium suite with spacious accommodations and personalized care.",
  "capacity": 1,
  "price_per_night": 85.00,
  "amenities": ["Private Outdoor Run", "Premium Bedding", "Gourmet Treats"],
  "size_sqft": 120,
  "available": true,
  "images": ["https://example.com/room1.jpg", "https://example.com/room2.jpg"],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### **Query Patterns:**
- **Get room by ID**: `room_id = "room-456e7890..."`
- **List all rooms**: `Scan` operation (with filters for type, price range)
- **Filter by type**: Application-level filtering after scan

---

### **3. 📅 Bookings Table**

**Table Name**: `dogotel-bookings-{environment}`

#### **Purpose:**
Reservation records, booking status, and customer stay history.

#### **Schema:**
```yaml
Primary Key: booking_id (String)
GSI 1: UserBookingsIndex (user_id)
GSI 2: RoomBookingsIndex (room_id)
Billing Mode: PAY_PER_REQUEST
```

#### **Attributes:**
| **Attribute** | **Type** | **Description** |
|---------------|----------|-----------------|
| `booking_id` | String (PK) | Unique booking identifier (UUID) |
| `user_id` | String (GSI) | User who made the booking |
| `room_id` | String (GSI) | Room being booked |
| `room_type` | String | Room type at time of booking |
| `check_in_date` | String | ISO timestamp for check-in |
| `check_out_date` | String | ISO timestamp for check-out |
| `number_of_dogs` | Number | Number of dogs for the stay |
| `total_cost` | Decimal | Total booking cost |
| `status` | String | pending, confirmed, completed, cancelled |
| `special_requests` | String | Customer special requests |
| `created_at` | String | ISO timestamp |
| `updated_at` | String | ISO timestamp |

#### **Sample Record:**
```json
{
  "booking_id": "book-789a1234-e89b-12d3-a456-426614174002",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "room_id": "room-456e7890-e89b-12d3-a456-426614174001",
  "room_type": "Luxury",
  "check_in_date": "2024-02-15T15:00:00Z",
  "check_out_date": "2024-02-17T11:00:00Z",
  "number_of_dogs": 1,
  "total_cost": 170.00,
  "status": "confirmed",
  "special_requests": "My dog loves squeaky toys!",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T09:15:00Z"
}
```

#### **Query Patterns:**
- **Get booking by ID**: `booking_id = "book-789a1234..."`
- **Get user's bookings**: GSI query on `UserBookingsIndex` with `user_id = "123e4567..."`
- **Get room's bookings**: GSI query on `RoomBookingsIndex` with `room_id = "room-456e7890..."`

---

### **4. ⭐ Reviews Table**

**Table Name**: `dogotel-reviews-{environment}`

#### **Purpose:**
Customer feedback, ratings, and review moderation.

#### **Schema:**
```yaml
Primary Key: review_id (String)
GSI: RoomReviewsIndex (room_id)
Billing Mode: PAY_PER_REQUEST
```

#### **Attributes:**
| **Attribute** | **Type** | **Description** |
|---------------|----------|-----------------|
| `review_id` | String (PK) | Unique review identifier (UUID) |
| `room_id` | String (GSI) | Room being reviewed |
| `user_id` | String | User who wrote the review |
| `booking_id` | String | Associated booking |
| `rating` | Number | 1-5 star rating |
| `comment` | String | Written review text |
| `status` | String | pending, approved, rejected |
| `admin_notes` | String | Internal admin notes |
| `created_at` | String | ISO timestamp |
| `updated_at` | String | ISO timestamp |
| `moderated_at` | String | ISO timestamp of moderation |
| `moderated_by` | String | Admin who moderated |

#### **Sample Record:**
```json
{
  "review_id": "rev-abc5678-e89b-12d3-a456-426614174003",
  "room_id": "room-456e7890-e89b-12d3-a456-426614174001", 
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "booking_id": "book-789a1234-e89b-12d3-a456-426614174002",
  "rating": 5,
  "comment": "Absolutely wonderful experience! My dog loved the luxury suite.",
  "status": "approved",
  "admin_notes": "Great positive review",
  "created_at": "2024-02-18T14:30:00Z",
  "updated_at": "2024-02-18T14:30:00Z",
  "moderated_at": "2024-02-18T16:45:00Z",
  "moderated_by": "admin@dogotel.com"
}
```

#### **Query Patterns:**
- **Get review by ID**: `review_id = "rev-abc5678..."`
- **Get room's reviews**: GSI query on `RoomReviewsIndex` with `room_id = "room-456e7890..."`
- **Get all reviews**: `Scan` operation (for admin dashboard)

---

## 🔗 **Data Relationships**

### **Entity Relationship Diagram:**
```
    ┌─────────────┐         ┌─────────────┐
    │   COGNITO   │         │    USERS    │
    │    Users    │◄─────►  │   (DynamoDB)│
    └─────────────┘         └─────────────┘
           │                        │
           │                        │ 1:N
           │                        ▼
           │                ┌─────────────┐
           │                │  BOOKINGS   │
           │                │ (DynamoDB)  │
           │                └─────────────┘
           │                        │ N:1
           │                        ▼
    ┌─────────────┐         ┌─────────────┐
    │    ROOMS    │◄─────►  │   REVIEWS   │
    │ (DynamoDB)  │         │ (DynamoDB)  │
    └─────────────┘         └─────────────┘
```

### **Key Relationships:**
1. **Cognito ↔ Users**: Email links Cognito auth to DynamoDB profile
2. **Users → Bookings**: One user can have many bookings (`user_id`)
3. **Rooms → Bookings**: One room can have many bookings (`room_id`)
4. **Bookings → Reviews**: One booking can have one review (`booking_id`)
5. **Rooms → Reviews**: One room can have many reviews (`room_id`)

---

## 🏗️ **Design Decisions & Rationale**

### **Why Cognito + DynamoDB?**

#### **✅ Benefits:**
1. **Security**: Cognito handles password security, JWT tokens, session management
2. **Scalability**: DynamoDB scales automatically with demand
3. **Cost Efficiency**: Pay-per-request billing ideal for educational use
4. **Separation of Concerns**: Auth logic separate from business logic
5. **AWS Integration**: Seamless API Gateway authorization

#### **🔄 Alternative Considered:**
- **Single DynamoDB Approach**: Would require custom auth implementation
- **RDS Approach**: Higher cost, more complex for serverless

### **Why Email as User ID?**
- **Simplicity**: Email is already unique in Cognito
- **User Experience**: Users remember their email easily
- **Cost Optimization**: Reduces complexity for educational environment

### **Why Separate User Tables?**
- **Extended Profiles**: DynamoDB stores business data Cognito can't
- **Query Flexibility**: Complex queries on user data
- **Data Relationships**: Foreign keys to bookings, reviews
- **Future Expansion**: Easy to add fields without Cognito schema changes

### **Global Secondary Indexes (GSI) Strategy:**
1. **EmailIndex (Users)**: Fast user lookup by email
2. **UserBookingsIndex (Bookings)**: Get all bookings for a user
3. **RoomBookingsIndex (Bookings)**: Get all bookings for a room
4. **RoomReviewsIndex (Reviews)**: Get all reviews for a room

---

## 💰 **Cost Optimization**

### **DynamoDB Cost Factors:**
- **Billing Mode**: PAY_PER_REQUEST (no pre-provisioned capacity)
- **Storage**: Minimal - only essential data stored
- **Read/Write**: On-demand pricing scales with usage
- **GSI**: Only essential indexes to minimize costs

### **Estimated Costs (Monthly):**
- **1000 reads**: ~$0.13
- **1000 writes**: ~$0.64  
- **1GB storage**: ~$0.25
- **Total**: **< $2/month** for typical educational usage

---

## 🛠️ **Sample Data & Testing**

### **Initialize Data Command:**
```bash
POST /admin/initialize
```

**Creates:**
- 2 sample users (admin + regular user) in both Cognito and DynamoDB
- 6 sample rooms (2 Economy, 2 Standard, 2 Luxury)
- Ready for booking and review testing

### **Sample Credentials:**
- **Admin**: `admin@dogotel.com` / `AdminPass123!`
- **User**: `user@example.com` / `UserPass123!`

---

## 🔍 **Query Examples**

### **Common Query Patterns:**

#### **1. User Authentication Flow:**
```python
# 1. Login via Cognito
cognito.admin_initiate_auth(...)

# 2. Get user profile from DynamoDB
users_table.query(
    IndexName='EmailIndex',
    KeyConditionExpression='email = :email'
)
```

#### **2. Room Availability Check:**
```python
# 1. Get room details
rooms_table.get_item(Key={'room_id': room_id})

# 2. Check existing bookings
bookings_table.query(
    IndexName='RoomBookingsIndex',
    KeyConditionExpression='room_id = :room_id'
)
```

#### **3. User Booking History:**
```python
# Get all bookings for a user
bookings_table.query(
    IndexName='UserBookingsIndex',
    KeyConditionExpression='user_id = :user_id'
)
```

#### **4. Room Reviews:**
```python
# Get all reviews for a room
reviews_table.query(
    IndexName='RoomReviewsIndex', 
    KeyConditionExpression='room_id = :room_id'
)
```

---

## 📊 **Monitoring & Maintenance**

### **CloudWatch Metrics to Monitor:**
- **DynamoDB**: Read/Write capacity, throttling, latency
- **Cognito**: User pool metrics, authentication success/failure
- **Lambda**: Function duration, error rates

### **Best Practices:**
1. **Data Backup**: DynamoDB point-in-time recovery
2. **Monitoring**: CloudWatch alarms for unusual activity  
3. **Cost Alerts**: Billing alerts for budget management
4. **Security**: Regular review of Cognito user pool settings

---

**🗄️ This hybrid architecture provides the perfect balance of security, scalability, and cost-effectiveness for the Dogotel educational project!** 