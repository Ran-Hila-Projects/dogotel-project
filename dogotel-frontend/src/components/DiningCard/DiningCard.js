import React from "react";
import "./DiningCard.css";

function DiningCard({ title, emoji, description, image }) {
  return (
    <div className="dining-card">
      <h3 className="dining-title">
        {title} {emoji}
      </h3>
      <p className="dining-description">{description}</p>
      <div className="dining-image-wrapper">
        <img src={image} alt={title} />
      </div>
      <button className="booking-button">Add to my booking</button>
    </div>
  );
}

export default DiningCard;
