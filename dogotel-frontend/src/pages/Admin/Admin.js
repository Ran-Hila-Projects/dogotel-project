import React, { useEffect, useState } from "react";
import "./Admin.css";
import roomsData from "../../data/rooms";

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

function AddRoomPopup({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    type: "",
    description: "",
    capacity: 1,
    pricePerNight: 0,
    image: "",
  });
  if (!open) return null;
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({
      name: "",
      type: "",
      description: "",
      capacity: 1,
      pricePerNight: 0,
      image: "",
    });
  };
  return (
    <div className="admin-popup-overlay">
      <div className="admin-popup">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>Add New Room</h2>
        <form onSubmit={handleSubmit} className="admin-room-form">
          <label>
            Name:
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Type:
            <input
              name="type"
              value={form.type}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Description:
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Capacity:
            <input
              name="capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Price per Night:
            <input
              name="pricePerNight"
              type="number"
              min="0"
              value={form.pricePerNight}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Image URL:
            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              required
            />
          </label>
          <button type="submit" className="submit-btn">
            Add Room
          </button>
        </form>
      </div>
    </div>
  );
}

function Admin({ userName }) {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState("bookings");
  const [addRoomOpen, setAddRoomOpen] = useState(false);

  useEffect(() => {
    setBookings(
      demoBookings
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    );
    setRooms(Object.values(roomsData));
  }, []);

  const handleAddRoom = (room) => {
    setRooms((prev) => [
      { ...room, id: (prev.length + 1).toString(), reviewCount: 0 },
      ...prev,
    ]);
    setAddRoomOpen(false);
  };

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
      <div className="admin-tabs">
        <button
          className={tab === "bookings" ? "active" : ""}
          onClick={() => setTab("bookings")}
        >
          Bookings View
        </button>
        <button
          className={tab === "rooms" ? "active" : ""}
          onClick={() => setTab("rooms")}
        >
          Rooms Management
        </button>
      </div>
      {tab === "bookings" && (
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
      )}
      {tab === "rooms" && (
        <section className="admin-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>Rooms Management</h2>
            <button
              className="add-room-btn"
              onClick={() => setAddRoomOpen(true)}
            >
              + Add Room
            </button>
          </div>
          <table className="admin-bookings-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Capacity</th>
                <th>Price/Night</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>
                    <img
                      src={room.image}
                      alt={room.title}
                      style={{ width: 60, borderRadius: 8 }}
                    />
                  </td>
                  <td>{room.title}</td>
                  <td>{room.subtitle}</td>
                  <td>{room.description}</td>
                  <td>{room.dogsAmount}</td>
                  <td>${room.price}</td>
                  <td>{room.reviews.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AddRoomPopup
            open={addRoomOpen}
            onClose={() => setAddRoomOpen(false)}
            onSubmit={handleAddRoom}
          />
        </section>
      )}
    </div>
  );
}

export default Admin;
