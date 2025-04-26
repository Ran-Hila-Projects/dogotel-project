import React, { useEffect } from "react";
import "./HomePage.css";
import heroImage from "../../assets/images/hero-image-home-page.jpg";
import SearchForm from "../../components/SearchBox/Search";
import Footer from "../../components/Footer/Footer";
import roomsImage from "../../assets/images/Rooms-home-page.jpg";
import servicesImage from "../../assets/images/services-home-page.jpg";
import diningImage from "../../assets/images/dining-home-page.jpg";
import { Link } from "react-router-dom";
import "../../general.css";

function HomePage() {
  useEffect(() => {
    const revealElements = document.querySelectorAll(".scroll-reveal");

    const revealOnScroll = () => {
      revealElements.forEach((el) => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 150; // adjust if needed

        if (elementTop < windowHeight - elementVisible) {
          el.classList.add("active");
        }
      });
    };

    window.addEventListener("scroll", revealOnScroll);
    revealOnScroll(); // trigger once in case something already visible

    return () => window.removeEventListener("scroll", revealOnScroll);
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero">
        <div
          className="hero-image fade-in-hero"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="hero-text">
            Your dog deserves
            <br />
            the very best.
          </div>
        </div>
      </div>
      {/* About Section */}
      <section className="about-section scroll-reveal">
        <div className="about-text">
          Dogotel is a digital dog boarding platform where pet owners can
          <span className="color-light-brown">
            easily find and book the perfect room{" "}
          </span>{" "}
          tailored to their dog's needs and dates.
        </div>
        <div className="about-image">
          <img
            src={require("../../assets/images/about-home-page.jpg")}
            alt="Dog and owner"
          />
        </div>
      </section>

      {/* Search Section */}
      <section className="search-section scroll-reveal">
        <h2>Search for a Room</h2>
        <div className="search-container">
          <SearchForm />
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section scroll-reveal">
        <div className="feature-item">
          <Link to="/rooms">
            <img src={roomsImage} alt="Rooms" />
            <h3>Rooms</h3>
          </Link>
        </div>
        <div className="wrapper-flex-col">
          <div className="feature-item">
            <Link to="/services">
              <img src={servicesImage} alt="Services" />
              <h3>Services</h3>
            </Link>
          </div>
          <div className="feature-item">
            <Link to="/dining">
              <img src={diningImage} alt="Dining" />
              <h3>Dining</h3>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default HomePage;
