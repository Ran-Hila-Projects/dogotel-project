import React from "react";
import ServiceCard from "../../components/ServiceCard/ServiceCard";
import "./Services.css";
import groomingImage from "../../assets/images/grooming-service.jpg";
import walksImage from "../../assets/images/walk-service.jpg";
import skillImage from "../../assets/images/skill-service.jpg";
import fitnessImage from "../../assets/images/train-service.jpg";
import Footer from "../../components/Footer/Footer";

function Services() {
  return (
    <div className="services-page">
      <section className="services-header">
        <h1>Our Services</h1>
        <p>
          At Dogotel, we believe your dog deserves more than just a place to
          stay — they deserve experiences. That’s why we offer a variety of
          services to keep your pup happy, active, and always learning.
        </p>
      </section>

      <section className="services-list">
        <ServiceCard
          title="Grooming"
          emoji="✂️"
          text1="Fresh, clean, and fluffy – our grooming service keeps your dog looking and feeling their best."
          text2="We use natural, dog-friendly products and give each pup a spa-like experience."
          image={groomingImage}
        />
        <ServiceCard
          title="Daily Walks"
          emoji="🚶‍♂️"
          text1="Every guest enjoys personalized daily walks to stretch, sniff, and stay active — rain or shine."
          text2="Walks are tailored to your dog's pace, curiosity, and walking style."
          image={walksImage}
        />
        <ServiceCard
          title="Learn a New Skill"
          emoji="🧠"
          text1="Why settle for “sit” when your dog can learn to sail, skateboard, or play chess?"
          text2="Our creative sessions build confidence and keep clever pups engaged."
          image={skillImage}
        />
        <ServiceCard
          title="Fitness Training"
          emoji="💪"
          text1="From zoomies to zen – we tailor fun workouts to your dog’s energy level and personality."
          text2="It’s the perfect mix of movement and motivation for a healthy, happy pup."
          image={fitnessImage}
        />
      </section>

      {/* Special Custom Section */}
      <section className="services-special">
        <h2>Looking for a special custom treatment for your dog? 🛠️</h2>
        <p>
          No problem! Call us at 052-8765342 to check availability and options.
        </p>
      </section>

      <Footer />
    </div>
  );
}

export default Services;
