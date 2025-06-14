import React, { useEffect, useState } from "react";
import Footer from "../../components/Footer/Footer";
import "./ARoom.css";
import ReviewCard from "../../components/ReviewCard/ReviewCard";
import { ReactComponent as DogIcon } from "../../assets/icons/dog-icon.svg";
import { ReactComponent as RulerIcon } from "../../assets/icons/ruler-icon.svg";
import { ReactComponent as DollarIcon } from "../../assets/icons/dollar-icon.svg";
import { Link, useLocation } from "react-router-dom";
import BookingPopup from "../../components/BookingPopup/BookingPopup";
import Loader from "../../components/Loader/Loader";

// Simulate async fetch call for room data
async function fetchRoomDataAsync(roomId) {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 300));
  // Demo data (could be replaced with real fetch)
  const rooms = {
    1: {
      id: "1",
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
      id: "2",
      title: "Deluxe Duo Den",
      subtitle: "For Active Explorers 🐕‍🦺",
      description:
        "Spacious and luxurious suite for two dogs. Great for siblings or best friends. Comes with two beds and extra treats.",
      dogsAmount: 2,
      size: "50m²",
      price: 80,
      image: require("../../assets/rooms-images/room-2.png"),
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
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function ARoom() {
  const query = useQuery();
  const roomId = query.get("id") || "1";
  const [roomData, setRoomData] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    setRoomData(null);
    fetchRoomDataAsync(roomId).then((data) => setRoomData(data));
  }, [roomId]);

  if (!roomData) {
    return <Loader />;
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
            <button
              className="booking-button"
              onClick={() => setBookingOpen(true)}
            >
              Include in my booking
            </button>
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
        <h2>What's Included? 🧸</h2>
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
      <BookingPopup
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        roomId={roomId}
        onSave={() => setBookingOpen(false)}
        dogsAmount={roomData.dogsAmount || 1}
        rooms={[
          {
            id: roomId,
            title: roomData.title,
            pricePerNight: roomData.price,
            dogsAllowed: roomData.dogsAmount,
          },
        ]}
      />
    </div>
  );
}

export default ARoom;
