import React from "react";
import "./HomePage.css";
import heroImage from "../../assets/images/hero-image-home-page.jpg";

function Hero() {
  return (
    <div className="hero">
      <div
        className="hero-image"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="hero-text">
          Your dog deserves
          <br />
          the very best.
        </div>
      </div>
    </div>
  );
}

export default Hero;
