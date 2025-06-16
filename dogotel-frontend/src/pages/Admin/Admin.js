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

function AddRoomPopup({ open, onClose, onSubmit, initialData, isEdit }) {
  const [form, setForm] = useState(
    initialData || {
      name: "",
      type: "",
      description: "",
      capacity: 1,
      pricePerNight: 0,
      image: "",
      size: "",
    }
  );
  useEffect(() => {
    if (initialData && isEdit) {
      setForm({
        name: initialData.title || "",
        type: initialData.subtitle || "",
        description: initialData.description || "",
        capacity: initialData.dogsAmount || 1,
        pricePerNight: initialData.price || 0,
        image: initialData.image || "",
        size: initialData.size || "",
      });
    }
  }, [initialData, isEdit]);

  if (!open) return null;
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((f) => ({ ...f, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
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
      size: "",
    });
  };
  return (
    <div className="admin-popup-overlay">
      <div className="admin-popup">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>{isEdit ? "Update Room Details" : "Add New Room"}</h2>
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
            Size of the room:
            <input
              name="size"
              value={form.size}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Image:
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
          </label>
          <button type="submit" className="submit-btn">
            {isEdit ? "Update Details" : "Add Room"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmationPopup({ open, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="admin-popup-overlay">
      <div className="admin-popup">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>Confirm Delete</h2>
        <p>Are you sure you want to delete this room?</p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
          <button onClick={onConfirm} className="delete-btn">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Admin({ userName }) {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState("bookings");
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    setBookings(
      demoBookings
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    );
    setRooms(Object.values(roomsData));
  }, []);

  const handleAddRoom = (room) => {
    const newRoom = {
      id: (rooms.length + 1).toString(),
      title: room.name,
      subtitle: room.type,
      description: room.description,
      dogsAmount: room.capacity,
      price: room.pricePerNight,
      image: room.image,
      size: room.size,
      reviews: [],
    };

    if (isEdit && selectedRoom) {
      setRooms((prev) =>
        prev.map((r) => (r.id === selectedRoom.id ? { ...r, ...newRoom } : r))
      );
    } else {
      setRooms((prev) => [newRoom, ...prev]);
    }

    setAddRoomOpen(false);
    setSelectedRoom(null);
    setIsEdit(false);
  };

  const handleEditRoom = (room) => {
    setSelectedRoom(room);
    setIsEdit(true);
    setAddRoomOpen(true);
  };

  const handleDeleteRoom = (room) => {
    setSelectedRoom(room);
    setDeleteConfirmationOpen(true);
  };

  const confirmDelete = () => {
    setRooms((prev) => prev.filter((r) => r.id !== selectedRoom.id));
    setDeleteConfirmationOpen(false);
    setSelectedRoom(null);
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
                <th>Size</th>
                <th>Reviews</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>
                    <img
                      src={room.image || "https://via.placeholder.com/60"}
                      alt={room.title || "room"}
                      style={{ width: 60, borderRadius: 8 }}
                    />
                  </td>
                  <td>{room.title}</td>
                  <td>{room.subtitle}</td>
                  <td>{room.description}</td>
                  <td>{room.dogsAmount}</td>
                  <td>${room.price}</td>
                  <td>{room.size}</td>
                  <td>{room.reviews?.length || 0}</td>
                  <td>
                    <button
                      onClick={() => handleEditRoom(room)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AddRoomPopup
            open={addRoomOpen}
            onClose={() => {
              setAddRoomOpen(false);
              setSelectedRoom(null);
              setIsEdit(false);
            }}
            onSubmit={handleAddRoom}
            initialData={selectedRoom}
            isEdit={isEdit}
          />
          <DeleteConfirmationPopup
            open={deleteConfirmationOpen}
            onClose={() => setDeleteConfirmationOpen(false)}
            onConfirm={confirmDelete}
          />
        </section>
      )}
    </div>
  );
}

export default Admin;
