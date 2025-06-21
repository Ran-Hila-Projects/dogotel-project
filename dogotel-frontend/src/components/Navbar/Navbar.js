import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { ReactComponent as ShoppingCart } from "../../assets/icons/shopping-cart.svg";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Navbar({ isLoggedIn, userName, onLogout }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.clear();
    if (onLogout) onLogout();
    navigate("/");
  };

  const isAdmin = userName === "admin";

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
              {isAdmin ? (
                <button
                  className="admin-nav-btn"
                  onClick={() => navigate("/admin")}
                >
                  Admin
                </button>
              ) : (
                <div className="user-info">
                  <Link to="/profile" className="user-avatar">
                    {getInitials(userName)}
                  </Link>
                  <Link to="/cart" className="cart-icon">
                    <ShoppingCart />
                  </Link>
                </div>
              )}
              <button className="logout-btn" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button className="login-btn" onClick={() => navigate("/login")}>
                Log in
              </button>
              <button
                className="signup-btn"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
