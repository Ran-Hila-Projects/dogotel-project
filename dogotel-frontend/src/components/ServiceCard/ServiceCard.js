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
        <button className="booking-button">Include in my booking</button>
      </div>
      <div className="service-image">
        <img src={image} alt={title} />
      </div>
    </div>
  );
}

export default ServiceCard;
