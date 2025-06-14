import React, { useEffect, useState } from "react";
import "./Cart.css";

function Cart() {
  const [cart, setCart] = useState({});

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
                <b>{cart.room.roomId || "Room"}</b>
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
      <div
        className="cart-section"
        style={{
          textAlign: "right",
          fontWeight: 700,
          fontSize: 20,
          color: "#3b1d0f",
        }}
      >
        Total: ${totalPrice}
      </div>
    </div>
  );
}

export default Cart;
