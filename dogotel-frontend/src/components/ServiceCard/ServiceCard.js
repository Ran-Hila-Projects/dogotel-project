import React from "react";
import "./ServiceCard.css";

function ServiceCard({
  title,
  text1,
  text2,
  image,
  emoji,
  isPassed,
  isActive,
  price,
  onAdd,
}) {
  const cardClass = isPassed
    ? "service-card passed"
    : isActive
    ? "service-card active"
    : "service-card";

  return (
    <div className={cardClass}>
      <div className="service-text">
        <h3>
          {title} {emoji}
        </h3>
        <p>{text1}</p>
        <p>{text2}</p>
        <div style={{ fontWeight: 500, color: "#3b1d0f", margin: "10px 0" }}>
          Price: {price ? `$${price}` : "N/A"}
        </div>
        {onAdd && (
          <button className="booking-button" onClick={onAdd}>
            Include in my booking
          </button>
        )}
      </div>
      <div className="service-image">
        <img src={image} alt={title} />
      </div>
    </div>
  );
}

export default ServiceCard;
