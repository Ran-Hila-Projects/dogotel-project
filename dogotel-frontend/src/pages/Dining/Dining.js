import React from "react";
import "./Dining.css";
import DiningCard from "../../components/DiningCard/DiningCard";
import Footer from "../../components/Footer/Footer";
import Toast from "../../components/Toast/Toast";

// import dog meal images
import breakfastImage from "../../assets/images/dog-breakfast.jpg";
import dinnerImage from "../../assets/images/dog-dinner.jpg";
import customImage from "../../assets/images/dog-custom-meal.jpg";

function Dining() {
  const [added, setAdded] = React.useState("");
  const [toastOpen, setToastOpen] = React.useState(false);

  const handleAddDining = (dining) => {
    let cart = {};
    try {
      cart = JSON.parse(localStorage.getItem("dogotelBooking")) || {};
    } catch (e) {}
    cart.dining = dining;
    localStorage.setItem("dogotelBooking", JSON.stringify(cart));
    setAdded(dining.title);
    setToastOpen(true);
    setTimeout(() => setAdded(""), 2000);
  };

  return (
    <div className="dining-page">
      <section className="dining-header">
        <h1>Dog Dining Options</h1>
        <p>
          At Dogotel, dining is an important part of the experience. We offer
          delicious, healthy meals tailored to your dog's tastes and needs.
        </p>
      </section>

      <section className="dining-list">
        <DiningCard
          title="Full-Day Meals"
          emoji="🍽️"
          description="Includes breakfast, lunch, and dinner each day — fresh meals to keep your dog happy & healthy throughout their stay."
          image={dinnerImage}
          price={20}
          onAdd={() =>
            handleAddDining({
              id: "full-day-meals",
              title: "Full-Day Meals",
              price: 20,
            })
          }
        />
        <DiningCard
          title="Half-Day Meals"
          emoji="🍳"
          description="Includes either breakfast or dinner daily — perfect for dogs with smaller appetites or shorter stays."
          image={breakfastImage}
          price={12}
          onAdd={() =>
            handleAddDining({
              id: "half-day-meals",
              title: "Half-Day Meals",
              price: 12,
            })
          }
        />
        <DiningCard
          title="Special Diet Plan"
          emoji="🥬"
          description="Custom-prepared meals tailored to your dog's specific dietary needs, including allergy-friendly and fitness-focused options."
          image={customImage}
          price={25}
          onAdd={() =>
            handleAddDining({
              id: "special-diet-plan",
              title: "Special Diet Plan",
              price: 25,
            })
          }
        />
      </section>

      <Footer />
      <Toast
        message="Dining option added to cart!"
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}

export default Dining;
