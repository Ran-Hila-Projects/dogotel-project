import React from "react";
import "./DiningCard.css";

function DiningCard({ title, emoji, description, image, onAdd }) {
  return (
    <div className="dining-card">
      <h3 className="dining-title">
        {title} {emoji}
      </h3>
      <p className="dining-description">{description}</p>
      <div className="dining-image-wrapper">
        <img src={image} alt={title} />
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
