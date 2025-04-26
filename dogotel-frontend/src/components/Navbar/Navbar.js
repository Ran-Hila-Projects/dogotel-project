import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import { ReactComponent as ShoppingCart } from "../../assets/icons/shopping-cart.svg";

function Navbar({ isLoggedIn }) {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="logo">
          Dogotel
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/rooms">Rooms</Link>
          <Link to="/dining">Dining</Link>
          <Link to="/services">Services</Link>
        </div>

        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <div className="user-info">
                <span className="user-avatar">HT</span>
                <Link to="/cart" className="cart-icon">
                  <ShoppingCart />
                </Link>
              </div>
              <button className="logout-btn">Log out</button>
            </>
          ) : (
            <button className="login-btn">Log in</button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
