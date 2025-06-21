import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CONFIG from "../../config";
import "./Signup.css";

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

function Signup({ setIsLoggedIn, setUserName }) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password validation: at least one letter, one capital, one symbol, one number
  function isValidPassword(pw) {
    return (
      /[a-z]/.test(pw) &&
      /[A-Z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw)
    );
  }

  const attemptAutoLogin = async (email, password) => {
    try {
      const loginRes = await fetch(`${CONFIG.API_URL}auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.success && loginData.accessToken) {
        // Store tokens in localStorage
        localStorage.setItem("access_token", loginData.accessToken);
        if (loginData.idToken)
          localStorage.setItem("id_token", loginData.idToken);
        if (loginData.refreshToken)
          localStorage.setItem("refresh_token", loginData.refreshToken);
        localStorage.setItem("userName", loginData.userName || email);
        
        // Store current user info for profile access
        localStorage.setItem("currentUser", JSON.stringify({
          email: email,
          userName: loginData.userName || email
        }));
        
        // Fetch and store user's dogs
        await fetchAndStoreDogs(email);
        
        setIsLoggedIn(true);
        setUserName(loginData.userName || email);
        // Redirect to home page
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        // Don't show error - just let user login manually
      }
    } catch (err) {
      // Don't show error - just let user login manually
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!firstName || !lastName || !birthday || !email || !password) {
      setError("All fields are required");
      return;
    }
    if (!isValidPassword(password)) {
      setError(
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one symbol."
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${CONFIG.API_URL}auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          birthday,
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Signup failed");
      }
      setSuccess(true);
      // Auto-login after successful signup
      await attemptAutoLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-outer">
      <div className="signup-card">
        <h2 className="signup-title">Create An Account</h2>
        <div className="signup-subtitle">
          Create an account to enjoy all the services we have!
        </div>
        <form className="signup-form" onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{ flex: 1 }}
            />
          </div>
          <input
            type="date"
            placeholder="Birthday"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
          />
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
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <div className="signup-error">{error}</div>}
          {success && (
            <div className="signup-success">
              Signup successful! Logging you in and redirecting to home page...
            </div>
          )}
          <button type="submit" disabled={loading} className="signup-btn">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <div className="signup-bottom-text">
          Already Have An Account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
