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
