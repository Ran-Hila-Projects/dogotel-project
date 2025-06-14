import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import { ReactComponent as ShoppingCart } from "../../assets/icons/shopping-cart.svg";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Navbar({ isLoggedIn, userName, onLogout }) {
  const handleLogout = () => {
    localStorage.clear();
    if (onLogout) onLogout();
  };

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
                <span className="user-avatar">{getInitials(userName)}</span>
                <Link to="/cart" className="cart-icon">
                  <ShoppingCart />
                </Link>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Log out
              </button>
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
