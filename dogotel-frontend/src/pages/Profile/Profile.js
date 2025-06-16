import React from "react";
import "./Profile.css";

// Dummy user data
const userData = {
  username: "John Doe",
  birthdate: "1990-01-01",
  email: "john.doe@example.com",
  photo: "https://via.placeholder.com/150",
};

// Dummy booking history
const bookingHistory = [
  {
    bookingNumber: "B001",
    dates: "2025-06-15 to 2025-06-18",
    dogs: ["Rocky"],
    diningSelection: "Premium",
    servicesSelection: "Grooming",
    totalPrice: 250,
  },
  {
    bookingNumber: "B002",
    dates: "2025-07-10 to 2025-07-13",
    dogs: ["Max"],
    diningSelection: "Standard",
    servicesSelection: "Training",
    totalPrice: 300,
  },
];

function Profile() {
  return (
    <div className="profile-page">
      <h1>Profile</h1>
      <div className="user-info-profile">
        <img
          src={userData.photo}
          alt={userData.username}
          className="user-photo"
        />
        <div className="user-details">
          <p>
            <strong>Username:</strong> {userData.username}
          </p>
          <p>
            <strong>Birthdate:</strong> {userData.birthdate}
          </p>
          <p>
            <strong>Email:</strong> {userData.email}
          </p>
        </div>
      </div>
      <h2 className="booking-history-title">Booking History</h2>
      <table className="booking-history-table">
        <thead>
          <tr>
            <th>Booking Number</th>
            <th>Dates</th>
            <th>Dogs</th>
            <th>Dining Selection</th>
            <th>Services Selection</th>
            <th>Total Price</th>
          </tr>
        </thead>
        <tbody>
          {bookingHistory.map((booking) => (
            <tr key={booking.bookingNumber}>
              <td>{booking.bookingNumber}</td>
              <td>{booking.dates}</td>
              <td>{booking.dogs.join(", ")}</td>
              <td>{booking.diningSelection}</td>
              <td>{booking.servicesSelection}</td>
              <td>${booking.totalPrice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Profile;
