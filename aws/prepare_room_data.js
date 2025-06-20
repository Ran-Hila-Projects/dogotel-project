const fs = require('fs');
const path = require('path');

// Function to get the account ID from command line args
function getAccountId() {
  const accountId = process.argv[2];
  if (!accountId) {
    console.error('❌ Please provide AWS Account ID as argument');
    process.exit(1);
  }
  return accountId;
}

// Function to generate room data with S3 URLs
function generateRoomData(accountId) {
  const imageBaseUrl = `https://dogotel-images-${accountId}.s3.amazonaws.com/images/rooms/`;
  
  const rooms = [
    {
      id: "1",
      title: "The Cozy Kennel",
      subtitle: "Perfect for Solo Nappers 💤",
      description: "A quiet, comfy room perfect for solo travelers. Includes a cozy bed, chew toys, and a snuggly blanket. Tail-wagging guaranteed.",
      dogsAmount: 1,
      size: "30m²",
      price: 55,
      image: `${imageBaseUrl}room-1.jpg`,
      included: [
        "Daily housekeeping (we pick up the poop 💩",
        "Soft orthopedic bed",
        "Water & food bowls (refilled daily!)",
        "Chew toys & squeaky duck for late-night conversations",
        "Fresh air window view",
        "Private potty area"
      ],
      reviews: [
        {
          name: "Hila Tsivion",
          stars: 5,
          review: "Amazing experience! My dog loved it!"
        },
        {
          name: "Ran Meshulam",
          stars: 4,
          review: "Great care, cozy room. Would book again!"
        },
        {
          name: "Adi Cohen",
          stars: 5,
          review: "They treated my pup like royalty."
        }
      ]
    },
    {
      id: "2",
      title: "Deluxe Duo Den",
      subtitle: "For Active Explorers 🐕‍🦺",
      description: "Spacious and luxurious suite for two dogs. Great for siblings or best friends. Comes with two beds and extra treats.",
      dogsAmount: 2,
      size: "50m²",
      price: 80,
      image: `${imageBaseUrl}room-2.png`,
      included: [
        "Private play area",
        "Water fountain for hydration",
        "Daily playtime with staff",
        "Sunlit windows",
        "Memory foam beds"
      ],
      reviews: [
        { name: "Maya Levi", stars: 5, review: "My dog loved the play area!" },
        {
          name: "Nadav Ben Ami",
          stars: 5,
          review: "Perfect for active dogs, lots of space."
        }
      ]
    },
    {
      id: "3",
      title: "Garden Sniff Suite",
      subtitle: "For Curious Noses 🌿",
      description: "A sunny room with direct access to our sniff-friendly garden. Ideal for active pups who love fresh grass and fresh air.",
      dogsAmount: 1,
      size: "35m²",
      price: 65,
      image: `${imageBaseUrl}room-3.png`,
      included: [
        "Fresh air window view",
        "Private potty area",
        "Access to garden sniff zone",
        "Chew toys & squeaky duck for late-night conversations",
        "Water & food bowls (refilled daily!)",
        "Daily housekeeping (we pick up the poop 💩"
      ],
      reviews: [
        {
          name: "Lior Peleg",
          stars: 5,
          review: "Our pup had the best time sniffing around the garden. Loved it!"
        },
        {
          name: "Dana Sela",
          stars: 4,
          review: "Great room for active dogs. Beautiful sun all day."
        }
      ]
    },
    {
      id: "4",
      title: "Spa Paws Retreat",
      subtitle: "For Pampered Pooches 💆‍♂️",
      description: "A calm, luxury suite for pampered pups. Includes spa-scented bedding and daily relaxation music.",
      dogsAmount: 1,
      size: "40m²",
      price: 90,
      image: `${imageBaseUrl}room-4.png`,
      included: [
        "Soft orthopedic bed",
        "Blanket-snuggle service on request",
        "Daily relaxation music",
        "Spa-scented bedding",
        "Private potty area",
        "Water & food bowls (refilled daily!)"
      ],
      reviews: [
        {
          name: "Tamar Avrahami",
          stars: 5,
          review: "My dog came back more relaxed than I am after a spa day 😂"
        },
        {
          name: "Noam Geffen",
          stars: 5,
          review: "They really know how to pamper pets here!"
        }
      ]
    },
    {
      id: "5",
      title: "Family Fur Cabin",
      subtitle: "Perfect for Pupper Parties 🐾🎉",
      description: "Perfect for 3 furry siblings – or a party! A wide room with space to run, jump and nap together.",
      dogsAmount: 3,
      size: "60m²",
      price: 100,
      image: `${imageBaseUrl}room-5.png`,
      included: [
        "Three soft orthopedic beds",
        "Large private play area",
        "Daily housekeeping (we pick up the poop 💩",
        "Water & food bowls (refilled daily!)",
        "Chew toys & squeaky duck for late-night conversations",
        "Fresh air window view"
      ],
      reviews: [
        {
          name: "Yael Bar-On",
          stars: 5,
          review: "Perfect for our 3 crazy pups! They had so much room to play."
        },
        {
          name: "Amit Tal",
          stars: 4,
          review: "Spacious and fun. Our dogs came home tired and happy!"
        }
      ]
    }
  ];

  return rooms;
}

// Main execution
const accountId = getAccountId();
const roomData = generateRoomData(accountId);

// Write to JSON file
const outputPath = path.join(__dirname, 'room_data.json');
fs.writeFileSync(outputPath, JSON.stringify({ rooms: roomData }, null, 2));

console.log(`✅ Room data prepared and saved to: ${outputPath}`);
console.log(`📊 Generated ${roomData.length} rooms with S3 image URLs`); 