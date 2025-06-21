import React, { useState, useEffect } from "react";
import "./BookingPopup.css";
import CONFIG from "../../config";

function getNextUnavailableDate(startDate, unavailableDates) {
  const start = new Date(startDate);
  const sorted = unavailableDates
    .map((d) => new Date(d))
    .filter((d) => d > start)
    .sort((a, b) => a - b);
  return sorted.length > 0 ? sorted[0] : null;
}

function isRangeContinuous(start, end, unavailableDates) {
  let d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    const dStr = d.toISOString().split("T")[0];
    if (unavailableDates.includes(dStr)) return false;
    d.setDate(d.getDate() + 1);
  }
  return true;
}

function getUnavailableDatesFromRanges(ranges) {
  const dates = [];
  for (const range of ranges) {
    let current = new Date(range.start);
    const end = new Date(range.end);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
  }
  return dates;
}

function BookingPopup({
  open,
  onClose,
  roomId,
  roomTitle,
  onSave,
  dogsAmount = 1,
  rooms = [], // Pass rooms if available for price lookup
}) {
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
  const [unavailableRanges, setUnavailableRanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedDogs, setSavedDogs] = useState([]);

  // Fetch unavailable ranges when roomId changes
  useEffect(() => {
    if (roomId && open) {
      fetchUnavailableRanges();
    }
  }, [roomId, open]);

  // Load saved dogs from localStorage when popup opens
  useEffect(() => {
    if (open) {
      try {
        const storedDogs = localStorage.getItem('userDogs');
        if (storedDogs) {
          const parsedDogs = JSON.parse(storedDogs);
          setSavedDogs(parsedDogs);
        }
      } catch (error) {
        console.error('Error loading saved dogs:', error);
      }
    }
  }, [open]);

  const fetchUnavailableRanges = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${CONFIG.API_URL}rooms/${roomId}/unavailable-ranges`
      );
      if (response.ok) {
        const data = await response.json();
        setUnavailableRanges(data.unavailableRanges || []);
      } else {
        console.error("Failed to fetch unavailable ranges");
        setUnavailableRanges([]);
      }
    } catch (error) {
      console.error("Error fetching unavailable ranges:", error);
      setUnavailableRanges([]);
    } finally {
      setLoading(false);
    }
  };

  const unavailableDates = getUnavailableDatesFromRanges(unavailableRanges);

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
    setStartDate("");
    setEndDate("");
  }, [dogsAmount, open]);

  const handleDogChange = (index, field, value) => {
    setDogs((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
    setError("");
    setShowFieldErrors(false);
  };

  const handleSelectSavedDog = (dogIndex, savedDog) => {
    setDogs((prev) => {
      const updated = [...prev];
      updated[dogIndex] = {
        name: savedDog.name,
        breed: savedDog.breed,
        age: savedDog.age.toString(),
        notes: "",
      };
      return updated;
    });
    setError("");
    setShowFieldErrors(false);
  };

  // Date logic
  const today = new Date().toISOString().split("T")[0];
  let endMin = startDate
    ? new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
    : today;
  let endMax = (() => {
    if (!startDate) return "";
    const nextUnavailable = getNextUnavailableDate(startDate, unavailableDates);
    if (!nextUnavailable) return "";
    const d = new Date(nextUnavailable);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  const isValid =
    startDate &&
    endDate &&
    isRangeContinuous(startDate, endDate, unavailableDates) &&
    dogs.every((dog) => dog.name.trim() && dog.breed.trim() && dog.age.trim());

  const handleSave = () => {
    if (!startDate || !endDate) {
      setError("Please select a valid date range.");
      setShowFieldErrors(true);
      return;
    }
    if (!isRangeContinuous(startDate, endDate, unavailableDates)) {
      setError(
        "Selected date range is not available. Please choose a continuous range without unavailable dates."
      );
      setShowFieldErrors(true);
      return;
    }
    if (
      !dogs.every(
        (dog) => dog.name.trim() && dog.breed.trim() && dog.age.trim()
      )
    ) {
      setShowFieldErrors(true);
      return;
    }
    setError("");
    setShowFieldErrors(false);
    
    // Find room details for pricing
    let pricePerNight = 0;
    if (rooms && rooms.length > 0 && roomId) {
      const foundRoom = rooms.find((r) => r.id === roomId);
      if (foundRoom) {
        pricePerNight = foundRoom.price || foundRoom.pricePerNight || 0;
      }
    }
    
    const bookingDetails = {
      roomId: roomId, // Backend expects roomId
      startDate,
      endDate,
      dogs,
      roomTitle,
      pricePerNight: pricePerNight
    };
    
    // Save to localStorage (merge with existing cart if present)
    let cart = {};
    try {
      cart = JSON.parse(localStorage.getItem("dogotelBooking")) || {};
    } catch (e) {}
    cart.room = bookingDetails;
    localStorage.setItem("dogotelBooking", JSON.stringify(cart));
    onSave && onSave(bookingDetails);
  };

  const handleStartDateChange = (value) => {
    if (unavailableDates.includes(value)) {
      setError(
        "Selected start date is unavailable. Please choose another date."
      );
      setStartDate("");
      setEndDate("");
      return;
    }
    setError("");
    setStartDate(value);
    setEndDate("");
  };

  if (!open) return null;

  return (
    <div className="booking-popup-overlay">
      <div className="booking-popup">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>Book Your Stay</h2>
        {loading && <p>Loading availability...</p>}
        <div className="calendar-section">
          <label>Choose your stay dates:</label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => handleStartDateChange(e.target.value)}
            disabled={loading}
          />
          <span style={{ margin: "0 10px" }}>to</span>
          <input
            type="date"
            value={endDate}
            min={endMin}
            max={endMax}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={!startDate || loading}
          />
        </div>
        <div className="dog-info-section">
          {dogs.map((dog, i) => (
            <div key={i} className="dog-fields">
              <h4>Dog {i + 1}</h4>
              
              {/* Saved Dogs Selection */}
              {savedDogs.length > 0 && (
                <div className="saved-dogs-section">
                  <span>Or select from your saved dogs:</span>
                  <div className="saved-dogs-buttons">
                    {savedDogs.map((savedDog, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="saved-dog-button"
                        onClick={() => handleSelectSavedDog(i, savedDog)}
                      >
                        {savedDog.photo && (
                          <img
                            src={savedDog.photo}
                            alt={savedDog.name}
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              objectFit: "cover"
                            }}
                          />
                        )}
                        {savedDog.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
        <button className="save-btn" onClick={handleSave} disabled={loading}>
          Save
        </button>
      </div>
    </div>
  );
}

export default BookingPopup;
