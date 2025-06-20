import React, { useEffect } from "react";
import "./Toast.css";

function Toast({ message, open, onClose, duration = 2200 }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  return <div className="toast-popup">{message}</div>;
}

export default Toast;

// NotLoggedInPopup: Modal for not-logged-in actions
export function NotLoggedInPopup({ open, onClose, onSignIn, onSignUp }) {
  if (!open) return null;
  return (
    <div className="not-loggedin-popup-overlay">
      <div className="not-loggedin-popup-modal">
        <h2>You are not logged in yet</h2>
        <p style={{ marginBottom: 24 }}>
          Please sign in or sign up to use this feature.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button className="not-loggedin-btn" onClick={onSignIn}>
            Sign In
          </button>
          <button className="not-loggedin-btn" onClick={onSignUp}>
            Sign Up
          </button>
        </div>
        <button
          className="not-loggedin-close-btn"
          onClick={onClose}
          style={{ marginTop: 18 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
