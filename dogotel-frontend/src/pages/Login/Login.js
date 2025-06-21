import React, { useState } from "react";
import { Link } from "react-router-dom";
import CONFIG from "../../config";
import "./Login.css";

// Utility function to fetch and store user's dogs
const fetchAndStoreDogs = async (userEmail) => {
  try {
    const dogsRes = await fetch(
      CONFIG.API_URL + `api/user/dogs?userEmail=${encodeURIComponent(userEmail)}`
    );
    if (dogsRes.ok) {
      const dogsData = await dogsRes.json();
      if (dogsData.success && Array.isArray(dogsData.dogs)) {
        localStorage.setItem('userDogs', JSON.stringify(dogsData.dogs));
        console.log('User dogs saved to localStorage:', dogsData.dogs.length, 'dogs');
      }
    }
  } catch (error) {
    console.error('Error fetching user dogs:', error);
  }
};

function Login({ setIsLoggedIn, setUserName }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password validation: at least one letter, one capital, one symbol, one number
  function isValidPassword(pw) {
    return (
      /[a-z]/.test(pw) &&
      /[A-Z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw)
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }
    if (!isValidPassword(password)) {
      setError(
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one symbol."
      );
      setLoading(false);
      return;
    }
    try {
      console.log("Attempting login with:", { email });
      const res = await fetch(`${CONFIG.API_URL}auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);
      if (!res.ok || !data.success || !data.accessToken) {
        throw new Error(data.error || "Login failed");
      }
      // Save tokens
      localStorage.setItem("access_token", data.accessToken);
      if (data.idToken) localStorage.setItem("id_token", data.idToken);
      if (data.refreshToken)
        localStorage.setItem("refresh_token", data.refreshToken);
      // Save userName/email for nav initials
      localStorage.setItem("userName", data.userName || email);
      
      // Store current user info for profile access
      localStorage.setItem("currentUser", JSON.stringify({
        email: email,
        userName: data.userName || email
      }));
      
      // Fetch and store user's dogs
      await fetchAndStoreDogs(email);
      
      setIsLoggedIn(true);
      setUserName(data.userName || email);
      // Redirect to home page
      window.location.href = "/";
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-outer">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <div className="login-subtitle">Sign in to your Dogotel account</div>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <div className="login-bottom-text">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
