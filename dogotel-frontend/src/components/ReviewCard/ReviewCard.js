import React from "react";
import "./ReviewCard.css";
import { ReactComponent as FullStar } from "../../assets/icons/star-full.svg";
import { ReactComponent as EmptyStar } from "../../assets/icons/star-empty.svg";

function ReviewCard({ name, stars, review }) {
  const fullStars = Array.from({ length: stars });
  const emptyStars = Array.from({ length: 5 - stars });

  return (
    <div className="review-card">
      <div className="review-header">
        <div className="review-name-stars">
          <h6>{name}</h6>
          <div className="review-stars">
            {fullStars.map((_, i) => (
              <span key={`full-${i}`}>
                <FullStar />
              </span>
            ))}
            {emptyStars.map((_, i) => (
              <span key={`empty-${i}`}>
                <EmptyStar />
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="review-text">{review}</p>
    </div>
  );
}

export default ReviewCard;
