import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CONFIG from "../../config";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const attemptAutoLogin = async (email, password) => {
    try {
      const loginRes = await fetch(`${CONFIG.API_URL}auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password }),
      });
      
      const loginData = await loginRes.json();
      
      if (loginRes.ok && loginData.success) {
        console.log('Auto-login successful');
        
        // Store tokens in localStorage
        localStorage.setItem('accessToken', loginData.accessToken);
        localStorage.setItem('idToken', loginData.idToken);
        localStorage.setItem('refreshToken', loginData.refreshToken);
        localStorage.setItem('userEmail', email);
        
        // Redirect to home page
        setTimeout(() => {
          navigate('/');
        }, 1500); // Short delay to show success message
      } else {
        console.log('Auto-login failed, user will need to login manually');
      }
    } catch (err) {
      console.error('Auto-login error:', err);
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
    
    if (!firstName || !lastName || !email || !password) {
      setError("All fields are required");
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Attempting signup with:', { firstName, lastName, email });
      
      const res = await fetch(`${CONFIG.API_URL}auth/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          firstName, 
          lastName, 
          email, 
          password 
        }),
      });
      
      console.log('Response status:', res.status);
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Signup failed");
      }
      
      setSuccess(true);
      
      // Auto-login after successful signup
      console.log('Signup successful, attempting auto-login...');
      await attemptAutoLogin(email, password);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <h1>Sign Up</h1>
      <form className="signup-form" onSubmit={handleSubmit}>
        <label>
          First Name:
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label>
          Last Name:
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Confirm Password:
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="signup-error">{error}</div>}
        {success && (
          <div className="signup-success">
            Signup successful! Logging you in and redirecting to home page...
          </div>
        )}
        <button type="submit" disabled={loading} className="signup-btn">
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}

export default Signup;
