import React, { useEffect, useState } from "react";
import Footer from "../../components/Footer/Footer";
import "./ARoom.css";
import ReviewCard from "../../components/ReviewCard/ReviewCard";
import { ReactComponent as DogIcon } from "../../assets/icons/dog-icon.svg";
import { ReactComponent as RulerIcon } from "../../assets/icons/ruler-icon.svg";
import { ReactComponent as DollarIcon } from "../../assets/icons/dollar-icon.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BookingPopup from "../../components/BookingPopup/BookingPopup";
import Loader from "../../components/Loader/Loader";
import ReviewWritingPopup from "../../components/ReviewWritingPopup/ReviewWritingPopup";
import Toast from "../../components/Toast/Toast";
import CONFIG from "../../config";

// Fetch room data from API
async function fetchRoomDataAsync(roomId) {
  try {
    console.log("Fetching room data for ID:", roomId);
    const response = await fetch(CONFIG.API_URL + `rooms/${roomId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Fetched room data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching room data:", error);
    return null;
  }
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
  const [submittingReview, setSubmittingReview] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const navigate = useNavigate();
  // TODO: Replace with real user from auth context
  const currentUser = {
    email: "user@example.com",
    id: "user-1",
    name: "Hila Tsivion",
  };

  // --- DUMMY LOGIC ---
  // Demo: pretend we fetch user bookings for this room
  const userBookingsForRoom = [
    { bookingId: "b1", roomId: roomId, status: "completed" },
  ];
  // Demo: pretend we fetch user reviews for this room
  const userHasReviewed =
    roomData && roomData.reviews.some((r) => r.name === currentUser.name);

  // --- REAL LOGIC (parallel, not used in UI yet) ---
  const [realUserBookingsForRoom, setRealUserBookingsForRoom] = useState([]);
  const [realUserHasReviewed, setRealUserHasReviewed] = useState(false);
  
  // Check if user has already reviewed this room
  useEffect(() => {
    if (!currentUser.email || !roomData) return;
    
    // Check if user has already reviewed this room
    const hasReviewed = roomData.reviews.some(review => 
      review.email === currentUser.email || review.name === currentUser.name
    );
    setRealUserHasReviewed(hasReviewed);
  }, [currentUser.email, roomData]);

  useEffect(() => {
    if (!currentUser.email || !roomId) return;
    // Fetch real user bookings for this room
    fetch(CONFIG.API_URL + `bookings/${currentUser.email}`)
      .then((res) => res.json())
      .then((history) => {
        if (Array.isArray(history)) {
          const filtered = history.filter((b) => b.roomId === roomId);
          setRealUserBookingsForRoom(filtered);
        }
      })
      .catch((err) => {
        // Optionally handle error
        setRealUserBookingsForRoom([]);
      });
  }, [currentUser.email, roomId]);

  // --- ENABLE REVIEW BUTTON LOGIC ---
  const canAddReview =
    (userBookingsForRoom.length > 0 || realUserBookingsForRoom.length > 0) &&
    !userHasReviewed &&
    !realUserHasReviewed;

  const handleReviewSubmit = async ({ stars, text }) => {
    setSubmittingReview(true);
    
    try {
      // Submit review to server
      const res = await fetch(CONFIG.API_URL + `rooms/${roomId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          stars,
          text,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit review");
      }

      const result = await res.json();
      console.log("Review submitted successfully:", result);
      
      // Close the popup
      setShowReviewPopup(false);
      
      // Refresh room data to show the new review
      const updatedRoomData = await fetchRoomDataAsync(roomId);
      setRoomData(updatedRoomData);
      
      // Show success message
      alert(`✅ Review submitted successfully! ${stars} stars`);
      
    } catch (err) {
      console.error("Error submitting review:", err);
      alert(`❌ Failed to submit review: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBookingSave = (data) => {
    setBookingOpen(false);
    setToastOpen(true);
    setTimeout(() => {
      navigate("/");
    }, 1200); // Give a short delay for toast, then redirect
  };

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
        <div className="add-review-btn-container">
          {canAddReview && (
            <button
              className="add-review-btn"
              onClick={() => setShowReviewPopup(true)}
              style={{ marginBottom: 16 }}
              disabled={submittingReview}
            >
              {submittingReview ? "Submitting..." : "Add a review"}
            </button>
          )}
          {!canAddReview && (userBookingsForRoom.length === 0 && realUserBookingsForRoom.length === 0) && (
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
              📝 You need to book this room before you can write a review
            </p>
          )}
          {!canAddReview && (userHasReviewed || realUserHasReviewed) && (
            <p style={{ color: '#27ae60', fontSize: '14px', marginBottom: '16px' }}>
              ✅ You have already reviewed this room
            </p>
          )}
        </div>
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
          onClose={() => !submittingReview && setShowReviewPopup(false)}
          onSubmit={handleReviewSubmit}
          disabled={submittingReview}
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
