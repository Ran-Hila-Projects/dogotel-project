import React, { useState } from "react";
import "./ReviewWritingPopup.css";
import { ReactComponent as FullStar } from "../../assets/icons/star-full.svg";
import { ReactComponent as EmptyStar } from "../../assets/icons/star-empty.svg";

function ReviewWritingPopup({ open, onClose, onSubmit }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const handleStarClick = (n) => setStars(n);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (stars < 1 || stars > 5) {
      setError("Please select a star rating (1-5)");
      return;
    }
    if (!text.trim()) {
      setError("Please write a review");
      return;
    }
    setError("");
    onSubmit && onSubmit({ stars, text });
    setStars(0);
    setText("");
  };

  return (
    <div className="review-popup-overlay">
      <div className="review-popup">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>Write a Review</h2>
        <form onSubmit={handleSubmit}>
          <div className="stars-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className="star"
                onClick={() => handleStarClick(n)}
                style={{ cursor: "pointer" }}
                role="button"
                aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
              >
                {n <= stars ? <FullStar /> : <EmptyStar />}
              </span>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience..."
            rows={5}
            className="review-textarea"
          />
          {error && <div className="review-error">{error}</div>}
          <div className="submit-btn-container">
            <button type="submit" className="submit-btn">
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewWritingPopup;
