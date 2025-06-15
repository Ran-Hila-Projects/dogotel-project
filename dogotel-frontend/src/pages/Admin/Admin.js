import React, { useEffect, useState } from "react";
import "./Admin.css";

// Dummy data for bookings
const demoBookings = [
  {
    bookingId: "b3",
    user: "user2@example.com",
    room: "Deluxe Duo Den",
    dogs: ["Max"],
    startDate: "2025-07-10",
    endDate: "2025-07-13",
    createdAt: "2025-06-01T12:30:00Z",
  },
  {
    bookingId: "b2",
    user: "user1@example.com",
    room: "The Cozy Kennel",
    dogs: ["Rocky"],
    startDate: "2025-06-15",
    endDate: "2025-06-18",
    createdAt: "2025-05-30T09:00:00Z",
  },
  {
    bookingId: "b1",
    user: "user3@example.com",
    room: "Family Fur Cabin",
    dogs: ["Bella", "Charlie", "Luna"],
    startDate: "2025-06-20",
    endDate: "2025-06-25",
    createdAt: "2025-05-28T15:45:00Z",
  },
];

function Admin({ userName }) {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // In a real app, fetch bookings from the server
    setBookings(
      demoBookings
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    );
  }, []);

  if (userName !== "admin") {
    return (
      <div className="admin-page">
        <h1>Admin Access Only</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <section className="admin-section">
        <h2>Bookings</h2>
        <table className="admin-bookings-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>User</th>
              <th>Room</th>
              <th>Dog(s)</th>
              <th>Dates</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.bookingId}>
                <td>{b.bookingId}</td>
                <td>{b.user}</td>
                <td>{b.room}</td>
                <td>{b.dogs.join(", ")}</td>
                <td>
                  {b.startDate} to {b.endDate}
                </td>
                <td>{new Date(b.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Admin;
