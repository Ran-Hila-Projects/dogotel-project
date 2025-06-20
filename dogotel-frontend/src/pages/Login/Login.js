import React, { useState } from "react";
import CONFIG from "../../config";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }
    
    try {
      console.log('Attempting login with:', { email });
      
      const res = await fetch(`${CONFIG.API_URL}auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password }),
      });
      
      console.log('Response status:', res.status);
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }
      
      // Save tokens
      if (data.accessToken) {
        localStorage.setItem("access_token", data.accessToken);
      }
      if (data.idToken) {
        localStorage.setItem("id_token", data.idToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("refresh_token", data.refreshToken);
      }
      
      // Redirect to home page
      window.location.href = "/";
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <h1>Log In</h1>
      <form className="login-form" onSubmit={handleSubmit}>
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
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={loading} className="login-btn">
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  );
}

export default Login;
