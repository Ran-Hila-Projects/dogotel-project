import React, { useState, useEffect } from "react";
import "./BookingPopup.css";

// Demo unavailable dates (YYYY-MM-DD)
const demoUnavailable = [
  "2024-07-10",
  "2024-07-11",
  "2024-07-12",
  "2024-07-20",
];

function BookingPopup({ open, onClose, roomId, onSave, dogsAmount = 1 }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dogs, setDogs] = useState(
    Array.from({ length: dogsAmount }, () => ({
      name: "",
      breed: "",
      age: "",
      notes: "",
    }))
  );
  const [error, setError] = useState("");
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  useEffect(() => {
    setDogs(
      Array.from({ length: dogsAmount }, () => ({
        name: "",
        breed: "",
        age: "",
        notes: "",
      }))
    );
    setError("");
    setShowFieldErrors(false);
  }, [dogsAmount, open]);

  // In the future, fetch unavailable dates for this roomId
  // useEffect(() => { fetchUnavailableDates(roomId) }, [roomId]);

  const handleDogChange = (index, field, value) => {
    setDogs((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
    setError("");
    setShowFieldErrors(false);
  };

  const isValid = dogs.every(
    (dog) => dog.name.trim() && dog.breed.trim() && dog.age.trim()
  );

  const handleSave = () => {
    if (!isValid) {
      setShowFieldErrors(true);
      return;
    }
    setError("");
    setShowFieldErrors(false);
    onSave && onSave({ startDate, endDate, dogs });
  };

  if (!open) return null;

  return (
    <div className="booking-popup-overlay">
      <div className="booking-popup">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>Book Your Stay</h2>
        <div className="calendar-section">
          <label>Choose your stay dates:</label>
          <input
            type="date"
            value={startDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ margin: "0 10px" }}>to</span>
          <input
            type="date"
            value={endDate}
            min={startDate || new Date().toISOString().split("T")[0]}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={!startDate}
          />
          <div className="unavailable-dates">
            <b>Unavailable:</b> {demoUnavailable.join(", ")}
          </div>
        </div>
        <div className="dog-info-section">
          {dogs.map((dog, i) => (
            <div key={i} className="dog-fields">
              <h4>Dog {i + 1}</h4>
              <div className="dog-fields-container">
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    id={`dog-name-${i}`}
                    name={`dog-name-${i}`}
                    value={dog.name}
                    onChange={(e) => handleDogChange(i, "name", e.target.value)}
                    placeholder="Name"
                    className={
                      showFieldErrors && !dog.name.trim() ? "input-error" : ""
                    }
                  />
                  {showFieldErrors && !dog.name.trim() && (
                    <span className="field-error-msg">Required</span>
                  )}
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    id={`dog-breed-${i}`}
                    name={`dog-breed-${i}`}
                    value={dog.breed}
                    onChange={(e) =>
                      handleDogChange(i, "breed", e.target.value)
                    }
                    placeholder="Breed"
                    className={
                      showFieldErrors && !dog.breed.trim() ? "input-error" : ""
                    }
                  />
                  {showFieldErrors && !dog.breed.trim() && (
                    <span className="field-error-msg">Required</span>
                  )}
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    id={`dog-age-${i}`}
                    name={`dog-age-${i}`}
                    value={dog.age}
                    onChange={(e) => handleDogChange(i, "age", e.target.value)}
                    placeholder="Age"
                    type="number"
                    min="0"
                    className={
                      showFieldErrors && !dog.age.trim() ? "input-error" : ""
                    }
                  />
                  {showFieldErrors && !dog.age.trim() && (
                    <span className="field-error-msg">Required</span>
                  )}
                </div>
              </div>
              <textarea
                id={`dog-notes-${i}`}
                name={`dog-notes-${i}`}
                value={dog.notes}
                onChange={(e) => handleDogChange(i, "notes", e.target.value)}
                placeholder="Anything we should know?"
              />
            </div>
          ))}
        </div>
        {error && (
          <div style={{ color: "#bb7c48", marginBottom: 10 }}>{error}</div>
        )}
        <button className="save-btn" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}

export default BookingPopup;
