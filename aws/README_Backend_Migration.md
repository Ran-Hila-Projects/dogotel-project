# Backend Data Migration Guide

## Overview
This guide documents the migration from static frontend data to backend-driven room data.

## Changes Made

### 1. Frontend Changes (`dogotel-frontend/src/pages/Rooms/Rooms.js`)
- ✅ Removed static `import rooms from "../../data/rooms"`
- ✅ Updated `fetchRooms()` to call backend API: `${CONFIG.API_URL}rooms`
- ✅ Added error handling for API failures with fallback to empty array
- ✅ Added console logging for debugging

### 2. Room Data Preparation (`aws/prepare_room_data.js`)
- ✅ Created Node.js script to generate room data with S3 image URLs
- ✅ Converts static data to use S3 bucket URLs: `https://dogotel-images-{ACCOUNT_ID}.s3.amazonaws.com/images/rooms/`
- ✅ Accepts AWS Account ID as command line parameter
- ✅ Outputs formatted JSON file for API upload

### 3. Deployment Script Updates (`aws/deploy_part2.sh`)
- ✅ Added room image upload to S3: `s3://dogotel-images-{ACCOUNT_ID}/images/rooms/`
- ✅ Added room data preparation step using `prepare_room_data.js`
- ✅ Added automatic API call to `/admin/initialize` endpoint with room data
- ✅ Added cleanup of temporary JSON files
- ✅ Maintained existing website build and upload functionality

### 4. Backend Handler Updates (`aws/src/handlers/initialize_data_handler.js`)
- ✅ Added support for custom room data in request body
- ✅ Created `createRoomsFromData()` function to process uploaded room data
- ✅ Maintained backward compatibility with sample data fallback
- ✅ Added proper data transformation for DynamoDB storage

## Deployment Flow

When you run `./deploy_part2.sh`, it will:

1. **Upload Room Images** 📸
   - Sync `../dogotel-frontend/src/assets/rooms-images/` → `s3://dogotel-images-{ACCOUNT_ID}/images/rooms/`

2. **Prepare Room Data** 📊
   - Run `node prepare_room_data.js {ACCOUNT_ID}`
   - Generate `room_data.json` with S3 image URLs

3. **Upload to Backend** 🚀
   - POST `room_data.json` to `{API_URL}admin/initialize`
   - Populate DynamoDB with room data

4. **Build & Deploy Website** 🌐
   - Build React app with `npm run build`
   - Upload to `s3://dogotel-website-{ACCOUNT_ID}`

5. **Cleanup** 🧹
   - Remove temporary `room_data.json` file

## Image URL Format
- **Before:** `require("../assets/rooms-images/room-1.jpg")`
- **After:** `https://dogotel-images-652867883117.s3.amazonaws.com/images/rooms/room-1.jpg`

## API Endpoints Used
- **GET** `/rooms` - List all rooms (used by frontend)
- **GET** `/rooms/{id}` - Get specific room
- **POST** `/admin/initialize` - Upload room data to backend

## Data Structure
Room data is stored in DynamoDB with this structure:
```json
{
  "room_id": "1",
  "title": "The Cozy Kennel",
  "subtitle": "Perfect for Solo Nappers 💤",
  "description": "A quiet, comfy room...",
  "dogsAmount": 1,
  "price": 55,
  "size": "30m²",
  "image": "https://dogotel-images-{ACCOUNT_ID}.s3.amazonaws.com/images/rooms/room-1.jpg",
  "included": ["Daily housekeeping", "..."],
  "reviews": [{"name": "...", "stars": 5, "review": "..."}],
  "is_available": true,
  "createdAt": "2024-...",
  "updatedAt": "2024-..."
}
```

## Frontend Compatibility
The frontend expects room objects with this structure:
```json
{
  "id": "1",
  "title": "The Cozy Kennel",
  "dogsAmount": 1,
  "price": 55,
  "image": "https://...",
  "included": [...],
  "reviews": [...]
}
```

The `transformRoomForFrontend()` function in `rooms_handler.js` handles the conversion from DynamoDB format to frontend format.

## Testing
After deployment, verify:
1. ✅ Room images are accessible at S3 URLs
2. ✅ `GET /rooms` returns room data from DynamoDB
3. ✅ Frontend displays rooms with S3 images
4. ✅ Room filtering and booking still work

## Rollback Plan
If issues occur, you can:
1. Temporarily revert `Rooms.js` to use static data
2. Re-import the static `rooms` data
3. Comment out the API call in `fetchRooms()` 