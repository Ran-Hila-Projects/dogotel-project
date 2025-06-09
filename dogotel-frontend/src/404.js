import React from "react";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        color: "#3b1d0f",
      }}
    >
      <div style={{ fontSize: 100, marginBottom: 20 }}>🐶</div>
      <h1 style={{ fontSize: 48, marginBottom: 10 }}>404 - Page Not Found</h1>
      <p style={{ fontSize: 20, marginBottom: 30, textAlign: "center" }}>
        Oops! This page has wandered off like a playful pup.
        <br />
        Let's get you back to the Dogotel home!
      </p>
      <Link
        to="/"
        style={{
          padding: "12px 32px",
          background: "#fff",
          color: "#3b1d0f",
          border: "2px solid #3b1d0f",
          borderRadius: 12,
          fontSize: 18,
          textDecoration: "none",
          fontWeight: 500,
          transition: "background 0.2s, color 0.2s",
        }}
      >
        Go Home
      </Link>
    </div>
  );
}

export default NotFound;
