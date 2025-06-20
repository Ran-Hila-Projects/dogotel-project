import React, { useEffect, useState } from "react";
import ServiceCard from "../../components/ServiceCard/ServiceCard";
import "./Services.css";
import groomingImage from "../../assets/images/grooming-service.jpg";
import walksImage from "../../assets/images/walk-service.jpg";
import skillImage from "../../assets/images/skill-service.jpg";
import fitnessImage from "../../assets/images/train-service.jpg";
import Footer from "../../components/Footer/Footer";
import Toast from "../../components/Toast/Toast";
import { NotLoggedInPopup } from "../../components/Toast/Toast";
import { useNavigate } from "react-router-dom";

function Services({ isLoggedIn }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [added, setAdded] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [notLoggedInOpen, setNotLoggedInOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const vh = window.innerHeight;
      const newIndex = Math.min(
        Math.floor((scrollPosition + vh / 2) / (vh / 2)),
        4
      );
      setActiveIndex(newIndex);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    {
      title: "Grooming",
      emoji: "✂️",
      text1:
        "Fresh, clean, and fluffy – our grooming service keeps your dog looking and feeling their best.",
      text2:
        "We use natural, dog-friendly products and give each pup a spa-like experience.",
      image: groomingImage,
      price: 30,
    },
    {
      title: "Daily Walks",
      emoji: "🚶‍♂️",
      text1:
        "Every guest enjoys personalized daily walks to stretch, sniff, and stay active — rain or shine.",
      text2:
        "Walks are tailored to your dog's pace, curiosity, and walking style.",
      image: walksImage,
      price: 15,
    },
    {
      title: "Learn a New Skill",
      emoji: "🧠",
      text1:
        'Why settle for "sit" when your dog can learn to sail, skateboard, or play chess?',
      text2:
        "Our creative sessions build confidence and keep clever pups engaged.",
      image: skillImage,
      price: 40,
    },
    {
      title: "Fitness Training",
      emoji: "💪",
      text1:
        "From zoomies to zen – we tailor fun workouts to your dog's energy level and personality.",
      text2:
        "It's the perfect mix of movement and motivation for a healthy, happy pup.",
      image: fitnessImage,
      price: 35,
    },
  ];

  const handleAddService = (service) => {
    if (!isLoggedIn) {
      setNotLoggedInOpen(true);
      return;
    }
    let cart = {};
    try {
      cart = JSON.parse(localStorage.getItem("dogotelBooking")) || {};
    } catch (e) {}
    if (!cart.services) cart.services = [];
    // Avoid duplicates
    if (!cart.services.find((s) => s.id === service.id)) {
      cart.services.push(service);
      setToastOpen(true);
    }
    localStorage.setItem("dogotelBooking", JSON.stringify(cart));
    setAdded(service.title);
    setTimeout(() => setAdded(""), 2000);
  };

  return (
    <div className="services-page">
      <section className="services-header">
        <h1>Our Services</h1>
        <p>
          At Dogotel, we believe your dog deserves more than just a place to
          stay — they deserve experiences. That's why we offer a variety of
          services to keep your pup happy, active, and always learning.
        </p>
      </section>

      <section className="services-list">
        {services.map((service, index) => (
          <div key={index} className="service-wrapper">
            <ServiceCard
              {...service}
              isPassed={index < activeIndex}
              isActive={index === activeIndex}
              onAdd={() =>
                handleAddService({
                  id: service.title.toLowerCase().replace(/ /g, "-"),
                  title: service.title,
                  price: service.price,
                })
              }
            />
          </div>
        ))}
      </section>

      {added && (
        <div style={{ textAlign: "center", color: "#3b1d0f", marginTop: 20 }}>
          Added {added} to your booking!
        </div>
      )}

      <div className="up-fix">
        <section className="services-special">
          <h2>Looking for a special custom treatment for your dog? 🦴</h2>
          <p>
            No problem! Call us at 052-8765342 to check availability and
            options.
          </p>
        </section>
        <Footer />
      </div>
      <Toast
        message="Service added to cart!"
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
      <NotLoggedInPopup
        open={notLoggedInOpen}
        onClose={() => setNotLoggedInOpen(false)}
        onSignIn={() => {
          setNotLoggedInOpen(false);
          navigate("/login");
        }}
        onSignUp={() => {
          setNotLoggedInOpen(false);
          navigate("/signup");
        }}
      />
    </div>
  );
}

export default Services;
