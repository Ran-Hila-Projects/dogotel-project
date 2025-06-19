# Dogotel Database Schema

A simple, scalable database design for the Dogotel dog boarding application using DynamoDB and S3.

## Overview

- **DynamoDB**: NoSQL database for application data
- **S3**: Object storage for images (rooms, user photos)
- **Design**: Optimized for the exact API requirements from Ran_dev.txt

## DynamoDB Tables

### 1. **RoomsTable** (DogotelRooms)
Stores room information with pricing and amenities.

**Primary Key**: `room_id` (String)

```json
{
  "room_id": "room-uuid-123",
  "title": "The Cozy Kennel",
  "subtitle": "Perfect for Solo Nappers 💤",
  "description": "A quiet, comfortable room for single dogs...",
  "dogsAmount": 1,
  "price": 55,
  "size": "30m²",
  "image": "https://dogotel-images.s3.amazonaws.com/rooms/room-uuid-123.jpg",
  "features": ["Daily housekeeping", "Soft orthopedic bed", "Climate control"],
  "included": ["Basic meals", "Exercise time", "24/7 care"],
  "reviews": [
    { "name": "Hila", "stars": 5, "review": "Amazing place!" }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Key Features**:
- `image`: S3 URL or base64 data (automatically converted to S3)
- `reviews`: Embedded array for quick display (also stored separately)
- `dogsAmount`: Maximum dogs allowed in room

---

### 2. **BookingsTable** (DogotelBookings)
Manages reservations with complete booking details.

**Primary Key**: `bookingId` (String)  
**GSI**: `UserBookingsIndex` on `userEmail`

```json
{
  "bookingId": "booking-uuid-789",
  "userEmail": "john@example.com",
  "room": {
    "roomId": "room-uuid-123",
    "roomTitle": "The Cozy Kennel",
    "startDate": "2025-07-10",
    "endDate": "2025-07-14",
    "pricePerNight": 55,
    "dogs": [
      {
        "name": "Buddy",
        "breed": "Golden Retriever",
        "age": 3,
        "notes": "Loves toys and treats"
      }
    ]
  },
  "dining": {
    "id": "premium-meals",
    "title": "Premium Meal Plan",
    "price": 30
  },
  "services": [
    {
      "id": "grooming",
      "title": "Full Grooming",
      "price": 25
    }
  ],
  "totalPrice": 320,
  "status": "confirmed",
  "createdAt": "2025-06-01T12:30:00Z",
  "updatedAt": "2025-06-01T12:30:00Z"
}
```

**Key Features**:
- **Nested Structure**: All booking data in one item for atomic operations
- **UserBookingsIndex**: Fast lookup of user's booking history
- **Flexible Services**: Array supports multiple add-on services
- **Dog Details**: Complete information per dog for personalized care

---

### 3. **DiningTable** (DogotelDining)
Available dining options and meal plans.

**Primary Key**: `dining_id` (String)

```json
{
  "dining_id": "premium-meals",
  "title": "Premium Meal Plan",
  "description": "Gourmet meals with organic ingredients",
  "price": 30,
  "details": "Three premium meals daily with specialized dietary options"
}
```

---

### 4. **ServicesTable** (DogotelServices)
Additional services (grooming, training, etc.).

**Primary Key**: `service_id` (String)

```json
{
  "service_id": "grooming",
  "title": "Professional Grooming",
  "description": "Full grooming service including bath and styling",
  "price": 25,
  "details": "Complete grooming package with nail trimming and ear cleaning"
}
```

---

### 5. **ReviewsTable** (DogotelReviews)
Customer reviews and ratings.

**Primary Key**: `review_id` (String)  
**GSI**: `RoomReviewsIndex` on `room_id`

```json
{
  "review_id": "review-uuid-456",
  "room_id": "room-uuid-123",
  "userId": "john@example.com",
  "stars": 5,
  "review": "Excellent experience! Buddy loved his stay.",
  "createdAt": "2024-07-20T10:00:00Z"
}
```

**Authentication**: Only users with completed bookings can review rooms.

---

### 6. **UsersTable** (DogotelUsers)
User profiles and account information.

**Primary Key**: `email` (String)

```json
{
  "email": "john@example.com",
  "username": "John Doe",
  "birthdate": "1990-01-01",
  "photo": "https://dogotel-images.s3.amazonaws.com/users/john@example.com.jpg"
}
```

**Key Features**:
- `email` as primary key for simplicity
- `photo`: S3 URL with base64 upload support

---

## S3 Storage

### **Images Bucket** (dogotel-images-{accountId})

**Structure**:
```
dogotel-images-123456789/
├── rooms/
│   ├── room-uuid-123.jpg
│   ├── room-uuid-456.png
│   └── ...
└── users/
    ├── john@example.com.jpg
    ├── jane@example.com.png
    └── ...
```

**Features**:
- **Public Read Access**: All images accessible via HTTPS URLs
- **Base64 Upload**: Automatic conversion from base64 to S3 objects
- **CORS Enabled**: Frontend can upload directly
- **Content Types**: Supports JPG, PNG image formats

**Upload Process**:
1. Frontend sends base64 image in API request
2. Lambda detects `data:image/` prefix
3. Converts to binary and uploads to S3
4. Returns public S3 URL for storage

---

## Data Relationships

```
Users (1) ←→ (N) Bookings ←→ (N) Reviews
                    ↓
              Rooms (1) ←→ (N) Reviews
                    ↓
              Dining & Services (referenced)
```

**Key Relationships**:
- **User → Bookings**: One user can have multiple bookings
- **Room → Bookings**: One room can have multiple bookings (different dates)
- **Booking → Review**: Only completed bookings can generate reviews
- **Room → Reviews**: Aggregate reviews shown on room details

---

## Query Patterns

### Common Operations:

1. **Get Available Rooms**: Scan RoomsTable
2. **Check Room Availability**: Query BookingsTable by room_id + date range
3. **User Booking History**: Query UserBookingsIndex by userEmail
4. **Room Reviews**: Query RoomReviewsIndex by room_id
5. **Create Booking**: Put item in BookingsTable + Send SQS notification

### Performance Optimizations:

- **GSI Indexes**: Fast user and room lookups
- **Embedded Data**: Reviews in rooms for quick display
- **Pay-per-Request**: Cost-effective for variable workloads
- **S3 CDN**: Fast image delivery globally

---

## Sample Data Flow

### Booking Creation:
1. **Validate**: Check room availability and user data
2. **Calculate**: Total price including room + dining + services
3. **Store**: Create booking record with all details
4. **Notify**: Send confirmation via SQS → SNS → Email
5. **Response**: Return booking ID and success status

### Image Upload:
1. **Receive**: Base64 image data in API request
2. **Process**: Extract format and decode binary data
3. **Upload**: Store in S3 with organized key structure
4. **Return**: Public HTTPS URL for database storage

This design ensures data consistency, fast queries, and scalable image storage while maintaining the exact API contract specified in Ran_dev.txt. 