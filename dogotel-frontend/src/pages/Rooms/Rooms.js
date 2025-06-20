import React, { useState, useEffect } from "react";
import "./Rooms.css";
import Footer from "../../components/Footer/Footer";
import SearchForm from "../../components/SearchBox/Search";
import { useLocation, useNavigate } from "react-router-dom";
import BookingPopup from "../../components/BookingPopup/BookingPopup";
import Loader from "../../components/Loader/Loader";
import Toast from "../../components/Toast/Toast";
import CONFIG from "../../config";
import { NotLoggedInPopup } from "../../components/Toast/Toast";

// Fetch rooms from backend API
async function fetchRooms() {
  try {
    console.log("Fetching rooms from:", CONFIG.API_URL + "rooms");
    const response = await fetch(CONFIG.API_URL + "rooms");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Fetched rooms:", data);
    // Convert array to object for compatibility with existing code
    if (Array.isArray(data)) {
      return data;
    }
    return Object.values(data);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    // Return empty array as fallback
    return [];
  }
}

// Check room availability for specific dates
async function checkRoomAvailability(roomId, checkin, checkout) {
  try {
    const response = await fetch(
      `${CONFIG.API_URL}rooms/${roomId}/unavailable-ranges`
    );
    if (!response.ok) {
      console.error("Failed to fetch unavailable ranges for room:", roomId);
      return true; // Assume available if can't check
    }
    
    const data = await response.json();
    const unavailableRanges = data.unavailableRanges || [];
    
    const requestStart = new Date(checkin);
    const requestEnd = new Date(checkout);
    
    // Check if request dates overlap with any unavailable range
    for (const range of unavailableRanges) {
      const rangeStart = new Date(range.start);
      const rangeEnd = new Date(range.end);
      
      // Check for overlap: request starts before range ends AND request ends after range starts
      if (requestStart <= rangeEnd && requestEnd >= rangeStart) {
        return false; // Room is not available
      }
    }
    
    return true; // Room is available
  } catch (error) {
    console.error("Error checking room availability:", error);
    return true; // Assume available if error
  }
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function Rooms({ isLoggedIn }) {
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
  const [loading, setLoading] = useState(true);
  const [notLoggedInOpen, setNotLoggedInOpen] = useState(false);

  // Fetch rooms on mount or when cleared
  useEffect(() => {
    setLoading(true);
    fetchRooms().then((data) => {
      setRooms(data);
      setFilteredRooms(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (searched) {
      filterRooms();
    } else {
      setFilteredRooms(rooms);
    }
  }, [dogs, searched, rooms, checkin, checkout]);

  const filterRooms = async () => {
    // First filter by dog count
    let filtered = rooms.filter(
      (room) => room.dogsAmount === parseInt(dogs)
    );
    
    // If dates are selected, also filter by availability
    if (checkin && checkout) {
      const availableRooms = [];
      
      // Check availability for each room
      for (const room of filtered) {
        const isAvailable = await checkRoomAvailability(room.id, checkin, checkout);
        if (isAvailable) {
          availableRooms.push(room);
        }
      }
      
      filtered = availableRooms;
    }
    
    setFilteredRooms(filtered);
  };

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
    if (!isLoggedIn) {
      setNotLoggedInOpen(true);
      return;
    }
    setSelectedRoomId(roomId);
    setBookingOpen(true);
  };

  const handleBookingClose = () => {
    setBookingOpen(false);
    setSelectedRoomId(null);
  };

  const handleBookingSave = (data) => {
    setBookingOpen(false);
    setToastOpen(true);
    setTimeout(() => {
      navigate("/");
    }, 1200); // Give a short delay for toast, then redirect
  };

  if (loading) {
    return <Loader />;
  }

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
            {searched && checkin && checkout 
              ? `No rooms available for ${dogs} dog(s) from ${checkin} to ${checkout}.`
              : `No rooms available for ${dogs} dog(s).`
            }
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
      <NotLoggedInPopup
        open={notLoggedInOpen}
        onClose={() => setNotLoggedInOpen(false)}
        onSignIn={() => {
          setNotLoggedInOpen(false);
          navigate("/login");
        }}
        onSignUp={() => {
          setNotLoggedInOpen(false);
          navigate("/signup");
        }}
      />
    </div>
  );
}

export default Rooms;
