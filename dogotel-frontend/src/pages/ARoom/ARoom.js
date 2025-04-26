import React, { useEffect, useState } from "react";
import Footer from "../../components/Footer/Footer";
import "./ARoom.css";
import ReviewCard from "../../components/ReviewCard/ReviewCard";
import { ReactComponent as DogIcon } from "../../assets/icons/dog-icon.svg";
import { ReactComponent as RulerIcon } from "../../assets/icons/ruler-icon.svg";
import { ReactComponent as DollarIcon } from "../../assets/icons/dollar-icon.svg";
import { Link } from "react-router-dom";

// Simulate server fetching (temporary)
const fetchRoomData = (roomId) => {
  // Imagine this object comes from your backend API
  const rooms = {
    1: {
      title: "The Cozy Kennel",
      subtitle: "Perfect for Solo Nappers 💤",
      description:
        "A quiet, comfy room perfect for solo travelers. Includes a cozy bed, chew toys, and a snuggly blanket. Tail-wagging guaranteed.",
      dogsAmount: 1,
      size: "30m²",
      price: 55,
      image: require("../../assets/rooms-images/room-1.jpg"),
      included: [
        "Daily housekeeping (we pick up the poop 💩",
        "Soft orthopedic bed",
        "Water & food bowls (refilled daily!)",
        "Chew toys & squeaky duck for late-night conversations",
        "Fresh air window view",
        "Private potty area",
      ],
      reviews: [
        {
          name: "Hila Tsivion",
          stars: 5,
          review: "Amazing experience! My dog loved it!",
        },
        {
          name: "Ran Meshulam",
          stars: 4,
          review: "Great care, cozy room. Would book again!",
        },
        {
          name: "Adi Cohen",
          stars: 5,
          review: "They treated my pup like royalty.",
        },
      ],
    },
    2: {
      title: "The Playful Suite",
      subtitle: "For Active Explorers 🐕‍🦺",
      description:
        "Spacious suite with play areas and plenty of room for energetic pups. Comes with premium chew toys and a view to the park.",
      dogsAmount: 2,
      size: "50m²",
      price: 80,
      image: require("../../assets/rooms-images/room-1.jpg"),
      included: [
        "Private play area",
        "Water fountain for hydration",
        "Daily playtime with staff",
        "Sunlit windows",
        "Memory foam beds",
      ],
      reviews: [
        { name: "Maya Levi", stars: 5, review: "My dog loved the play area!" },
        {
          name: "Nadav Ben Ami",
          stars: 5,
          review: "Perfect for active dogs, lots of space.",
        },
      ],
    },
  };

  return rooms[roomId] || null;
};

function ARoom() {
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    // Simulate room ID coming from URL or navigation
    const roomId = "1"; // Temporary: in future this will be dynamic
    const data = fetchRoomData(roomId);
    setRoomData(data);
  }, []);

  if (!roomData) {
    return <div>Loading room details...</div>;
  }

  return (
    <div className="aroom-page">
      {/* Room Details Section */}
      <section className="room-details">
        <div className="details-text">
          <h1>{roomData.title}</h1>
          <h2>{roomData.subtitle}</h2>
          <p>{roomData.description}</p>

          <div className="details-info">
            <div className="wrapper-flex">
              <DogIcon />
              <p>
                <strong>Dogs amount:</strong> 0{roomData.dogsAmount}
              </p>
            </div>
            <div className="wrapper-flex">
              <RulerIcon />
              <p>
                <strong>Size of the room:</strong> {roomData.size}
              </p>
            </div>
            <div className="wrapper-flex">
              <DollarIcon />
              <p>
                <strong>Price per night:</strong> {roomData.price}$
              </p>
            </div>
            <button className="booking-button">Include in my booking</button>
          </div>
          <div className="details-actions">
            <div className="separator-line"></div>

            <div className="add-options">
              <p>Want to add dining, walks, or training?</p>
              <div className="buttons-wrapper">
                <Link to="/services" className="routing-button">
                  Add Services to Stay
                </Link>
                <Link to="/dining" className="routing-button">
                  Add Dining
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="details-image">
          <img src={roomData.image} alt={roomData.title} />
        </div>
      </section>

      {/* What's Included Section */}
      <section className="whats-included-section">
        <h2>What’s Included? 🧸</h2>
        <div className="included-list">
          {roomData.included.map((item, index) => (
            <span key={index}>{item}</span>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="reviews-section">
        <h2>Owner Reviews</h2>
        <div className="reviews-list">
          {roomData.reviews.map((review, index) => (
            <ReviewCard
              key={index}
              name={review.name}
              stars={review.stars}
              review={review.review}
            />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default ARoom;
