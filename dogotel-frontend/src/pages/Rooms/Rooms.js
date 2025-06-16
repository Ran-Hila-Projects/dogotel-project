import React, { useState, useEffect } from "react";
import "./Rooms.css";
import Footer from "../../components/Footer/Footer";
import SearchForm from "../../components/SearchBox/Search";
import { useLocation, useNavigate } from "react-router-dom";
import BookingPopup from "../../components/BookingPopup/BookingPopup";
import Loader from "../../components/Loader/Loader";
import Toast from "../../components/Toast/Toast";
import rooms from "../../data/rooms";

// Future: fetch from AWS DynamoDB
async function fetchRooms() {
  // In the future, fetch from server
  // const response = await fetch('/api/rooms');
  // return await response.json();
  return Object.values(rooms);
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function Rooms() {
  const query = useQuery();
  const navigate = useNavigate();
  const [checkin, setCheckin] = useState(query.get("checkin") || "");
  const [checkout, setCheckout] = useState(query.get("checkout") || "");
  const [dogs, setDogs] = useState(query.get("dogs") || "1");
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  // Track if a search has been performed
  const [searched, setSearched] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);

  // Fetch rooms on mount or when cleared
  useEffect(() => {
    fetchRooms().then((data) => {
      setRooms(data);
      setFilteredRooms(data);
    });
  }, []);

  useEffect(() => {
    if (searched) {
      // Filter rooms by dogsAllowed (exact match)
      const filtered = rooms.filter(
        (room) => room.dogsAmount === parseInt(dogs)
      );
      setFilteredRooms(filtered);
    } else {
      setFilteredRooms(rooms);
    }
  }, [dogs, searched, rooms]);

  const handleSearch = ({ checkin, checkout, dogs }) => {
    setCheckin(checkin);
    setCheckout(checkout);
    setDogs(dogs);
    setSearched(true);
    // Update URL
    navigate(`/rooms?checkin=${checkin}&checkout=${checkout}&dogs=${dogs}`);
  };

  const showSummary =
    searched && (dogs !== "" || checkin !== "" || checkout !== "");

  const handleClear = () => {
    setCheckin("");
    setCheckout("");
    setDogs("");
    setFilteredRooms(rooms);
    setSearched(false);
    navigate("/rooms");
  };

  const handleRoomClick = (roomId) => {
    navigate(`/aroom?id=${roomId}`);
  };

  const handleBookClick = (e, roomId) => {
    e.stopPropagation();
    setSelectedRoomId(roomId);
    setBookingOpen(true);
  };

  const handleBookingClose = () => {
    setBookingOpen(false);
    setSelectedRoomId(null);
  };

  const handleBookingSave = (data) => {
    setBookingOpen(false);
    setSelectedRoomId(null);
    setToastOpen(true);
    // Optionally show a success message
  };

  return (
    <div className="rooms-page">
      <header className="rooms-header">
        <h1>Our Rooms</h1>
        <p className="rooms-subtitle">
          Choose the perfect stay for your furry friend – comfy, clean, and
          tail-wag approved.
        </p>
      </header>
      <section className="search-section">
        <h2>Search for a Room</h2>
        <div className="search-container">
          <SearchForm
            initialCheckin={checkin}
            initialCheckout={checkout}
            initialDogs={dogs}
            onSearch={handleSearch}
          />
        </div>
      </section>
      {showSummary && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            background: "#f8f2eb",
            borderRadius: 16,
            padding: "18px 32px",
            margin: "30px auto 10px auto",
            maxWidth: 700,
            fontSize: 18,
            color: "#3b1d0f",
            boxShadow: "0 2px 8px rgba(60,31,16,0.06)",
          }}
        >
          <span>
            Rooms for{" "}
            {dogs ? (dogs === "1" ? "1 dog" : `${dogs} dogs`) : "all dogs"}
            {checkin && checkout && (
              <>
                {" "}
                from <b>{checkin}</b> to <b>{checkout}</b>
              </>
            )}
          </span>
          <button
            style={{
              marginLeft: 24,
              background: "#fff",
              color: "#3b1d0f",
              border: "1.5px solid #bb7c48",
              borderRadius: 10,
              padding: "7px 22px",
              fontSize: 16,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
            }}
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      )}
      <section className="rooms-list">
        {filteredRooms.length === 0 ? (
          <div style={{ color: "#bb7c48", fontSize: 22, margin: "40px auto" }}>
            No rooms available for {dogs} dog(s).
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              className="room-card"
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              style={{ cursor: "pointer" }}
            >
              <div className="room-info-container">
                <h2 className="room-title">{room.title}</h2>
                <p className="room-description">{room.description}</p>
                <div className="room-info-and-btn">
                  <div className="room-info">
                    <span>🐕 Dogs Allowed: {room.dogsAmount}</span>
                    <span>💲 {room.price} / night</span>
                  </div>
                  <button
                    className="book-btn"
                    onClick={(e) => handleBookClick(e, room.id)}
                  >
                    Book
                  </button>
                </div>
              </div>
              <img
                className="room-image"
                src={room.image}
                alt={room.title}
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
          ))
        )}
      </section>
      <BookingPopup
        open={bookingOpen}
        onClose={handleBookingClose}
        roomId={selectedRoomId}
        roomTitle={
          selectedRoomId
            ? rooms.find((r) => r.id === selectedRoomId)?.title || ""
            : ""
        }
        onSave={handleBookingSave}
        dogsAmount={
          selectedRoomId
            ? rooms.find((r) => r.id === selectedRoomId)?.dogsAmount || 1
            : 1
        }
        rooms={rooms}
      />
      <Footer />
      <Toast
        message="Room added to cart!"
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}

export default Rooms;
