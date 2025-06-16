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
import ReviewWritingPopup from "../../components/ReviewWritingPopup/ReviewWritingPopup";
import Toast from "../../components/Toast/Toast";
import rooms from "../../data/rooms";

// Simulate async fetch call for room data
async function fetchRoomDataAsync(roomId) {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 300));
  // Use the imported rooms data
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
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    setRoomData(null);
    fetchRoomDataAsync(roomId).then((data) => setRoomData(data));
  }, [roomId]);

  if (!roomData) {
    return <Loader />;
  }

  // Demo: get current user (in real app, get from auth context)
  const currentUser = { id: "user-1", name: "Hila Tsivion" };
  // Demo: pretend we fetch user bookings for this room
  const userBookingsForRoom = [
    { bookingId: "b1", roomId: roomData.id, status: "completed" },
  ];
  // Demo: pretend we fetch user reviews for this room
  const userHasReviewed = roomData.reviews.some(
    (r) => r.name === currentUser.name
  );
  const canAddReview = userBookingsForRoom.length > 0 && !userHasReviewed;

  const handleReviewSubmit = ({ stars, text }) => {
    // In real app, POST to server
    alert(`Review submitted: ${stars} stars, text: ${text}`);
    setShowReviewPopup(false);
    // Optionally, refresh reviews
  };

  const handleBookingSave = (data) => {
    setBookingOpen(false);
    setToastOpen(true);
    // Optionally show a success message
  };

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
        {canAddReview && (
          <button
            className="add-review-btn"
            onClick={() => setShowReviewPopup(true)}
            style={{ marginBottom: 16 }}
          >
            Add a review
          </button>
        )}
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
        <ReviewWritingPopup
          open={showReviewPopup}
          onClose={() => setShowReviewPopup(false)}
          onSubmit={handleReviewSubmit}
        />
      </section>
      <Footer />
      <BookingPopup
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        roomId={roomId}
        roomTitle={roomData.title}
        onSave={handleBookingSave}
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
      <Toast
        message="Room added to cart!"
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}

export default ARoom;
