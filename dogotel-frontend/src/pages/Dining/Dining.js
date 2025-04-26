import React from "react";
import "./Dining.css";
import DiningCard from "../../components/DiningCard/DiningCard";
import Footer from "../../components/Footer/Footer";

// import dog meal images
import breakfastImage from "../../assets/images/dog-breakfast.jpg";
import dinnerImage from "../../assets/images/dog-dinner.jpg";
import customImage from "../../assets/images/dog-custom-meal.jpg";

function Dining() {
  return (
    <div className="dining-page">
      <section className="dining-header">
        <h1>Dog Dining Options</h1>
        <p>
          At Dogotel, dining is an important part of the experience. We offer
          delicious, healthy meals tailored to your dog’s tastes and needs.
        </p>
      </section>

      <section className="dining-list">
        <DiningCard
          title="Full-Day Meals"
          emoji="🍽️"
          description="Includes breakfast, lunch, and dinner each day — fresh meals to keep your dog happy & healthy throughout their stay."
          image={dinnerImage}
        />
        <DiningCard
          title="Half-Day Meals"
          emoji="🍳"
          description="Includes either breakfast or dinner daily — perfect for dogs with smaller appetites or shorter stays."
          image={breakfastImage}
        />
        <DiningCard
          title="Special Diet Plan"
          emoji="🥬"
          description="Custom-prepared meals tailored to your dog's specific dietary needs, including allergy-friendly and fitness-focused options."
          image={customImage}
        />
      </section>

      <Footer />
    </div>
  );
}

export default Dining;
