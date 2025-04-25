import React from "react";
import "./Search.css";
import { Link } from "react-router-dom";

function SearchForm() {
  return (
    <div className="search-inputs">
      <div className="input-group">
        <label htmlFor="checkin">Check-in</label>
        <input type="date" id="checkin" />
      </div>
      <div className="input-group">
        <label htmlFor="checkout">Check-out</label>
        <input type="date" id="checkout" />
      </div>
      <div className="input-group">
        <label htmlFor="dogs">Number of Dogs</label>
        <select id="dogs">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3+</option>
        </select>
      </div>
      <Link to="/rooms">
        <button className="search-button">Check Availability</button>
      </Link>
    </div>
  );
}

export default SearchForm;
