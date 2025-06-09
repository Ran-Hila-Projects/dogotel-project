import React, { useState } from "react";
import "./Search.css";
import { useNavigate } from "react-router-dom";

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

  return (
    <form className="search-inputs" onSubmit={handleSearch}>
      <div className="input-group">
        <label htmlFor="checkin">Check-in</label>
        <input
          type="date"
          id="checkin"
          value={checkin}
          onChange={(e) => setCheckin(e.target.value)}
        />
      </div>
      <div className="input-group">
        <label htmlFor="checkout">Check-out</label>
        <input
          type="date"
          id="checkout"
          value={checkout}
          onChange={(e) => setCheckout(e.target.value)}
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
