import React, { useState } from "react";
import "./Search.css";
import { useNavigate } from "react-router-dom";

function getToday() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function SearchForm({
  initialCheckin = "",
  initialCheckout = "",
  initialDogs = "1",
  onSearch,
}) {
  const [checkin, setCheckin] = useState(initialCheckin);
  const [checkout, setCheckout] = useState(initialCheckout);
  const [dogs, setDogs] = useState(initialDogs);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({ checkin, checkout, dogs });
    } else {
      // Pass values as query params to /rooms
      navigate(`/rooms?checkin=${checkin}&checkout=${checkout}&dogs=${dogs}`);
    }
  };

  const today = getToday();

  return (
    <form className="search-inputs" onSubmit={handleSearch}>
      <div className="input-group">
        <label htmlFor="checkin">Check-in</label>
        <input
          type="date"
          id="checkin"
          value={checkin}
          min={today}
          onChange={(e) => {
            setCheckin(e.target.value);
            if (checkout && e.target.value > checkout) {
              setCheckout("");
            }
          }}
        />
      </div>
      <div className="input-group">
        <label htmlFor="checkout">Check-out</label>
        <input
          type="date"
          id="checkout"
          value={checkout}
          min={checkin || today}
          onChange={(e) => setCheckout(e.target.value)}
          disabled={!checkin}
        />
      </div>
      <div className="input-group">
        <label htmlFor="dogs">Dogs</label>
        <select
          id="dogs"
          value={dogs}
          onChange={(e) => setDogs(e.target.value)}
        >
          <option value="1">01</option>
          <option value="2">02</option>
          <option value="3">03</option>
          <option value="4">04</option>
        </select>
      </div>
      <div className="input-group">
        <button className="search-button" type="submit">
          Check Availability
        </button>
      </div>
    </form>
  );
}

export default SearchForm;
