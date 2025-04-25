import React from "react";
import "./HomePage.css";
import heroImage from "../../assets/images/hero-image-home-page.jpg";
import SearchForm from "../../components/SearchBox/Search";
import Footer from "../../components/Footer/Footer";
import roomsImage from "../../assets/images/Rooms-home-page.jpg";
import servicesImage from "../../assets/images/services-home-page.jpg";
import diningImage from "../../assets/images/dining-home-page.jpg";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="home-page">
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
      <section className="about-section">
        <div className="about-text">
          Dogotel is a digital dog boarding platform where pet owners can easily
          find and book the perfect room tailored to their dog's needs and
          dates.
        </div>
        <div className="about-image">
          <img
            src={require("../../assets/images/about-home-page.jpg")}
            alt="Dog and owner"
          />
        </div>
      </section>

      <section className="search-section">
        <div className="search-container">
          <h3>Search for a Room</h3>
          <SearchForm />
        </div>
      </section>

      <section className="features-section">
        <div className="feature-item">
          <Link to="/rooms">
            <img src={roomsImage} alt="Rooms" />
            <h3>Rooms</h3>
          </Link>
        </div>
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
      </section>

      <Footer />
    </div>
  );
}

export default HomePage;
