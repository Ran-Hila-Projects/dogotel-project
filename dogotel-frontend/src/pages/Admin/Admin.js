import React, { useEffect, useState } from "react";
import "./Admin.css";
import CONFIG from "../../config";

// Removed dummy bookings data - now using real data from API

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
      imageChanged: false,
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
        imageChanged: false,
      });
    } else if (!isEdit) {
      setForm({
        name: "",
        type: "",
        description: "",
        capacity: 1,
        pricePerNight: 0,
        image: "",
        size: "",
        imageChanged: false,
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
        setForm((f) => ({ ...f, image: reader.result, imageChanged: true }));
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
      imageChanged: false,
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
            {isEdit && form.image && (
              <div style={{ marginBottom: "10px" }}>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  Current image:
                </p>
                <img
                  src={form.image}
                  alt="Current"
                  style={{
                    width: "100px",
                    height: "60px",
                    objectFit: "cover",
                    borderRadius: "4px",
                    marginBottom: "5px",
                  }}
                />
                <p
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    wordBreak: "break-all",
                  }}
                >
                  {form.image}
                </p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required={!isEdit}
            />
            {isEdit && (
              <small
                style={{ color: "#666", display: "block", marginTop: "5px" }}
              >
                Leave empty to keep current image
              </small>
            )}
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

function Admin({ userName, userEmail, isAdmin }) {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState("bookings");
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAdminData() {
      try {
        setLoading(true);
        setError("");

        // Fetch all bookings with admin authorization
        const bookingsRes = await fetch(CONFIG.API_URL + "bookings", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
        });
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          console.log("Admin bookings data:", bookingsData);

          if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
            setBookings(bookingsData.bookings);
          } else if (Array.isArray(bookingsData)) {
            // Handle case where response is directly an array
            setBookings(bookingsData);
          } else {
            console.log("No bookings found or invalid format");
            setBookings([]);
          }
        } else {
          console.log(
            "Failed to fetch bookings:",
            bookingsRes.status,
            await bookingsRes.text()
          );
          setBookings([]); // Set empty array instead of demo data
        }

        // Fetch all rooms with admin authorization
        const roomsRes = await fetch(CONFIG.API_URL + "rooms", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
        });
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          console.log("Admin rooms data:", roomsData);

          if (roomsData.success && Array.isArray(roomsData.rooms)) {
            setRooms(roomsData.rooms);
          } else if (Array.isArray(roomsData)) {
            setRooms(roomsData);
          } else {
            console.log("No rooms found or invalid format");
            setRooms(Object.values(roomsData || {}));
          }
        } else {
          console.log("Failed to fetch rooms:", roomsRes.status);
          setRooms([]); // Set empty array instead of static data
        }
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError("Failed to load admin data");
        // Set empty arrays when there's an error
        setBookings([]);
        setRooms([]);
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const handleAddRoom = async (room) => {
    try {
      const roomData = {
        title: room.name,
        subtitle: room.type,
        description: room.description,
        dogsAmount: room.capacity,
        price: room.pricePerNight,
        size: room.size,
        included: [
          "Comfortable bedding",
          "Daily walks",
          "Feeding service",
          "24/7 supervision",
        ],
        reviews: [],
      };

      // Only include image if it's a new room or if the image was changed during edit
      if (!isEdit || room.imageChanged) {
        roomData.image = room.image;
      }

      if (isEdit && selectedRoom) {
        // Update existing room
        const response = await fetch(
          CONFIG.API_URL + `rooms/${selectedRoom.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify(roomData),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update room");
        }

        const result = await response.json();
        console.log("Room updated successfully:", result);

        // Update local state
        setRooms((prev) =>
          prev.map((r) =>
            r.id === selectedRoom.id ? { ...r, ...roomData } : r
          )
        );

        alert("✅ Room updated successfully!");
      } else {
        // Add new room
        const response = await fetch(CONFIG.API_URL + "rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify(roomData),
        });

        if (!response.ok) {
          throw new Error("Failed to add room");
        }

        const result = await response.json();
        console.log("Room added successfully:", result);

        // Refresh rooms list
        const roomsResponse = await fetch(CONFIG.API_URL + "rooms", {
          headers: { Authorization: "Bearer admin-token" },
        });
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData);
        }

        alert("✅ Room added successfully!");
      }

      setAddRoomOpen(false);
      setSelectedRoom(null);
      setIsEdit(false);
    } catch (error) {
      console.error("Error managing room:", error);
      alert(`❌ Failed to ${isEdit ? "update" : "add"} room: ${error.message}`);
    }
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

  const confirmDelete = async () => {
    try {
      // Delete room from server
      const response = await fetch(
        CONFIG.API_URL + `rooms/${selectedRoom.id}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer admin-token" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      const result = await response.json();
      console.log("Room deleted successfully:", result);

      // Update local state
      setRooms((prev) => prev.filter((r) => r.id !== selectedRoom.id));

      alert("✅ Room deleted successfully!");
    } catch (error) {
      console.error("Error deleting room:", error);
      alert(`❌ Failed to delete room: ${error.message}`);
    } finally {
      setDeleteConfirmationOpen(false);
      setSelectedRoom(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <h1>Admin Access Only</h1>
        <p>You do not have permission to view this page.</p>
        <p>Current user: {userEmail || userName}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-page">
        <h1>Admin Dashboard</h1>
        <p>Loading admin data...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <p>
        Welcome, {userName} ({userEmail})
      </p>
      {error && (
        <div
          style={{
            color: "#e74c3c",
            padding: "10px",
            backgroundColor: "#fdf2f2",
            borderRadius: "4px",
            margin: "10px 0",
          }}
        >
          {error}
        </div>
      )}
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
                <th>Total Price</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#666",
                    }}
                  >
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((b, idx) => (
                  <tr key={b.bookingId || b.bookingNumber || b.id || idx}>
                    <td>{b.bookingId || b.bookingNumber || b.id || "-"}</td>
                    <td>{b.user || b.userEmail || b.email || "-"}</td>
                    <td>{b.room || b.roomName || b.roomTitle || "-"}</td>
                    <td>
                      {Array.isArray(b.dogs)
                        ? b.dogs
                            .map((d) => (typeof d === "string" ? d : d.name))
                            .join(", ")
                        : b.dogs || "-"}
                    </td>
                    <td>
                      {b.startDate && b.endDate
                        ? `${b.startDate} to ${b.endDate}`
                        : b.dates || "-"}
                    </td>
                    <td>${b.totalPrice || 0}</td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          backgroundColor:
                            b.status === "confirmed" ? "#d4edda" : "#f8d7da",
                          color:
                            b.status === "confirmed" ? "#155724" : "#721c24",
                        }}
                      >
                        {b.status || "unknown"}
                      </span>
                    </td>
                    <td>
                      {b.createdAt
                        ? new Date(b.createdAt).toLocaleString()
                        : b.created_at
                        ? new Date(b.created_at).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
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
              {rooms.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#666",
                    }}
                  >
                    No rooms found
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
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
                ))
              )}
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
