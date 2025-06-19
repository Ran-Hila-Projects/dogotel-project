import React, { useEffect, useState } from "react";
import "./Cart.css";
import Toast from "../../components/Toast/Toast";
import ReactConfetti from "react-confetti";
import CONFIG from "../../config";

function BookingSuccessModal({ open, dogNames, onClose }) {
  if (!open) return null;
  return (
    <div className="booking-success-modal-overlay">
      <div className="booking-success-modal">
        <h2>Booking Successful!</h2>
        <p>
          Excited to have {dogNames.join(", ")} with us!{" "}
          <span role="img" aria-label="dog">
            🐶
          </span>
        </p>
        <button onClick={onClose} className="close-btn-booking-success">
          Close
        </button>
      </div>
    </div>
  );
}

function Cart() {
  const [cart, setCart] = useState({});
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [dogNames, setDogNames] = useState([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("dogotelBooking")) || {};
      setCart(data);
    } catch (e) {
      setCart({});
    }
  }, []);

  // Calculate prices
  let roomPrice = 0;
  if (
    cart.room &&
    cart.room.pricePerNight &&
    cart.room.startDate &&
    cart.room.endDate
  ) {
    // Calculate nights
    const start = new Date(cart.room.startDate);
    const end = new Date(cart.room.endDate);
    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    roomPrice = nights * cart.room.pricePerNight;
  }
  const diningPrice = cart.dining && cart.dining.price ? cart.dining.price : 0;
  const servicesPrice =
    cart.services && cart.services.length > 0
      ? cart.services.reduce((sum, s) => sum + (s.price || 0), 0)
      : 0;
  const totalPrice = roomPrice + diningPrice + servicesPrice;

  const canBook = !!(cart.room && cart.dining);

  const handleBookNow = async () => {
    setBookingLoading(true);
    setBookingError("");
    try {
      // Dummy async function to simulate booking
      await new Promise((res) => setTimeout(res, 1200));
      // Uncomment below for real API call:
      // const response = await fetch(CONFIG.API_URL + "api/bookings", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(cart),
      // });
      // if (!response.ok) throw new Error("Booking failed. Please try again.");
      // Optionally clear cart or update UI
      const dogs =
        cart.room && cart.room.dogs ? cart.room.dogs.map((d) => d.name) : [];
      setDogNames(dogs);
      setSuccessModalOpen(true);
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 3500);
    } catch (e) {
      setBookingError(e.message || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="cart-page">
      <h1>Your Booking Cart</h1>
      <div className="cart-section">
        <h2>Room</h2>
        {cart.room ? (
          <div className="cart-room">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <b>{cart.room.roomTitle || "Room"}</b>
                <div>
                  Dates: {cart.room.startDate} to {cart.room.endDate}
                </div>
                <div>
                  Dogs:
                  <ul>
                    {cart.room.dogs &&
                      cart.room.dogs.map((dog, i) => (
                        <li key={i}>
                          {dog.name} ({dog.breed}, {dog.age} yrs)
                          {dog.notes && <> - {dog.notes}</>}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
              {cart.room.pricePerNight &&
                cart.room.startDate &&
                cart.room.endDate && (
                  <div
                    style={{
                      fontWeight: 500,
                      color: "#3b1d0f",
                      marginLeft: 32,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Price: ${cart.room.pricePerNight} x nights = ${roomPrice}
                  </div>
                )}
            </div>
          </div>
        ) : (
          <div>No room selected.</div>
        )}
      </div>
      <div className="cart-section">
        <h2>Dining</h2>
        {cart.dining ? (
          <div
            className="cart-dining"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <b>{cart.dining.title}</b>
            {cart.dining.price && (
              <div
                style={{
                  fontWeight: 500,
                  color: "#3b1d0f",
                  marginLeft: 32,
                  whiteSpace: "nowrap",
                }}
              >
                Price: ${cart.dining.price}
              </div>
            )}
          </div>
        ) : (
          <div>No dining option selected.</div>
        )}
      </div>
      <div className="cart-section">
        <h2>Services</h2>
        {cart.services && cart.services.length > 0 ? (
          <ul className="cart-services">
            {cart.services.map((service, i) => (
              <li key={i}>
                <div className="service-line">
                  <span>{service.title}</span>
                  {service.price && (
                    <span className="service-price">
                      Price: ${service.price}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div>No services selected.</div>
        )}
      </div>
      <div className="cart-section cart-section-total">
        Total: ${totalPrice}
        <button
          className="book-now-btn"
          onClick={handleBookNow}
          disabled={!canBook || bookingLoading}
          style={{
            marginLeft: 24,
            padding: "10px 32px",
            fontSize: 18,
            fontWeight: 600,
            background: "#bb7c48",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: !canBook || bookingLoading ? "not-allowed" : "pointer",
            opacity: !canBook || bookingLoading ? 0.3 : 1,
            transition: "background 0.2s, color 0.2s, opacity 0.2s",
          }}
        >
          {bookingLoading ? "Booking..." : "Book Now"}
        </button>
      </div>
      {bookingError && (
        <div style={{ color: "#e74c3c", textAlign: "right", marginTop: 10 }}>
          {bookingError}
        </div>
      )}
      <BookingSuccessModal
        open={successModalOpen}
        dogNames={dogNames}
        onClose={() => setSuccessModalOpen(false)}
      />
      {confettiActive && (
        <ReactConfetti
          numberOfPieces={120}
          recycle={false}
          width={window.innerWidth}
          height={window.innerHeight}
          confettiSource={{ x: 0, y: 0, w: window.innerWidth, h: 0 }}
          drawShape={(ctx) => {
            ctx.font = "40px serif";
            ctx.fillText("🐶", 0, 0);
          }}
        />
      )}
    </div>
  );
}

export default Cart;
