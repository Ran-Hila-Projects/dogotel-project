import React from "react";
import "./ServiceCard.css";

function ServiceCard({ title, text1, text2, image, emoji }) {
  return (
    <div className="service-card">
      <div className="service-text">
        <h3>
          {title} {emoji}
        </h3>
        <p>{text1}</p>
        <p>{text2}</p>
        <button className="booking-button">Include in my booking</button>
      </div>
      <div className="service-image">
        <img src={image} alt={title} />
      </div>
    </div>
  );
}

export default ServiceCard;
