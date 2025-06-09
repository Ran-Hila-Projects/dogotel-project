import React, { useState, useEffect } from "react";
import "./Rooms.css";
import room1 from "../../assets/rooms-images/room-1.jpg";
import room2 from "../../assets/rooms-images/room-2.png";
import room3 from "../../assets/rooms-images/room-3.png";
import room4 from "../../assets/rooms-images/room-4.png";
import room5 from "../../assets/rooms-images/room-5.png";
import Footer from "../../components/Footer/Footer";
import SearchForm from "../../components/SearchBox/Search";
import { useLocation, useNavigate } from "react-router-dom";

const rooms = [
  {
    id: "cozy-kennel",
    title: "The Cozy Kennel",
    description:
      "Perfect for solo nappers. A quiet, comfy room for solo travelers. Includes a cozy bed, chew toys, and a snuggly blanket.",
    dogsAllowed: 1,
    pricePerNight: 55,
    imagePath: room1,
  },
  {
    id: "deluxe-duo-den",
    title: "Deluxe Duo Den",
    description:
      "Spacious and luxurious suite for two dogs. Great for siblings or best friends. Comes with two beds and extra treats.",
    dogsAllowed: 2,
    pricePerNight: 80,
    imagePath: room2,
  },
  {
    id: "garden-sniff-suite",
    title: "Garden Sniff Suite",
    description:
      "A sunny room with direct access to our sniff-friendly garden. Ideal for active pups who love fresh grass and fresh air.",
    dogsAllowed: 1,
    pricePerNight: 65,
    imagePath: room3,
  },
  {
    id: "spa-paws-retreat",
    title: "Spa Paws Retreat",
    description:
      "A calm, luxury suite for pampered pups. Includes spa-scented bedding and daily relaxation music.",
    dogsAllowed: 1,
    pricePerNight: 90,
    imagePath: room4,
  },
  {
    id: "family-fur-cabin",
    title: "Family Fur Cabin",
    description:
      "Perfect for 3 furry siblings – or a party! A wide room with space to run, jump and nap together.",
    dogsAllowed: 3,
    pricePerNight: 100,
    imagePath: room5,
  },
];

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function Rooms() {
  const query = useQuery();
  const navigate = useNavigate();
  const [checkin, setCheckin] = useState(query.get("checkin") || "");
  const [checkout, setCheckout] = useState(query.get("checkout") || "");
  const [dogs, setDogs] = useState(query.get("dogs") || "1");
  const [filteredRooms, setFilteredRooms] = useState(rooms);

  useEffect(() => {
    // Filter rooms by dogsAllowed
    const filtered = rooms.filter((room) => room.dogsAllowed >= parseInt(dogs));
    setFilteredRooms(filtered);
  }, [dogs]);

  const handleSearch = ({ checkin, checkout, dogs }) => {
    setCheckin(checkin);
    setCheckout(checkout);
    setDogs(dogs);
    // Update URL
    navigate(`/rooms?checkin=${checkin}&checkout=${checkout}&dogs=${dogs}`);
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
      <div
        style={{
          textAlign: "center",
          margin: "30px 0 10px 0",
          fontSize: "18px",
          color: "#3b1d0f",
        }}
      >
        Dogs amount selected: <b>{dogs}</b>
      </div>
      <section className="rooms-list">
        {filteredRooms.length === 0 ? (
          <div style={{ color: "#bb7c48", fontSize: 22, margin: "40px auto" }}>
            No rooms available for {dogs} dog(s).
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div className="room-card" key={room.id}>
              <div className="room-info-container">
                <h2 className="room-title">{room.title}</h2>
                <p className="room-description">{room.description}</p>
                <div className="room-info-and-btn">
                  <div className="room-info">
                    <span>🐕 Dogs Allowed: {room.dogsAllowed}</span>
                    <span>💲 {room.pricePerNight} / night</span>
                  </div>
                  <button className="book-btn">Book</button>
                </div>
              </div>
              <img
                className="room-image"
                src={room.imagePath}
                alt={room.title}
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
          ))
        )}
      </section>
      <Footer />
    </div>
  );
}

export default Rooms;
