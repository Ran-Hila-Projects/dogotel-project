import React from "react";
import "./DiningCard.css";

function DiningCard({ title, emoji, description, image, price, onAdd }) {
  return (
    <div className="dining-card">
      <div className="dining-title">
        {emoji} {title}
      </div>
      <div className="dining-description">{description}</div>
      <div className="dining-image-wrapper">
        <img src={image} alt={title} />
      </div>
      <div style={{ fontWeight: 500, color: "#3b1d0f", margin: "10px 0" }}>
        Price: {price ? `$${price}` : "N/A"}
      </div>
      {onAdd && (
        <button className="booking-button" onClick={onAdd}>
          Add to my booking
        </button>
      )}
    </div>
  );
}

export default DiningCard;
