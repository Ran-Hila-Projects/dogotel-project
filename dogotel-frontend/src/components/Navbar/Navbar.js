import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { ReactComponent as ShoppingCart } from "../../assets/icons/shopping-cart.svg";
import CONFIG from "../../config";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Navbar({ isLoggedIn, userName, onLogout }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);

  // Function to check if user is admin via Cognito
  const checkAdminStatus = async (userEmail) => {
    if (!userEmail || adminCheckLoading) return false;
    
    setAdminCheckLoading(true);
    try {
      const response = await fetch(CONFIG.API_URL + `auth/check-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.isAdmin || false;
      }
    } catch (error) {
      console.error('Error checking admin status in navbar:', error);
    } finally {
      setAdminCheckLoading(false);
    }
    return false;
  };

  // Get current user email from localStorage
  const getCurrentUserEmail = () => {
    // Try to get user from currentUser object
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        return user.email;
      } catch (e) {
        console.error('Error parsing currentUser:', e);
      }
    }
    
    // Fallback: try to get from userName if it's an email format
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName && storedUserName.includes("@")) {
      return storedUserName;
    }
    
    return null;
  };

  // Check admin status when user logs in
  useEffect(() => {
    if (isLoggedIn && userName && !adminCheckLoading) {
      const userEmail = getCurrentUserEmail();
      if (userEmail) {
        checkAdminStatus(userEmail).then(setIsAdmin);
      } else {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [isLoggedIn, userName]);

  const handleLogout = () => {
    localStorage.clear();
    setIsAdmin(false);
    if (onLogout) onLogout();
    navigate("/");
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
