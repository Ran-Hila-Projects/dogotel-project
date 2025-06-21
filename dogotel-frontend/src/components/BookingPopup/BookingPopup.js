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
  rooms = [],
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

  useEffect(() => {
    if (roomId && open) {
      fetchUnavailableRanges();
    }
    if (open) {
      const dogsFromStorage =
        JSON.parse(localStorage.getItem("userDogs")) || [];
      setSavedDogs(dogsFromStorage);
    }
  }, [roomId, open]);

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
        ...updated[dogIndex],
        name: savedDog.name,
        breed: savedDog.breed,
        age: savedDog.age,
      };
      return updated;
    });
  };

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

    let pricePerNight = 0;
    if (rooms && rooms.length > 0 && roomId) {
      const foundRoom = rooms.find((r) => r.id === roomId);
      if (foundRoom) {
        pricePerNight = foundRoom.price || foundRoom.pricePerNight || 0;
      }
    }

    const bookingDetails = {
      roomId: roomId,
      startDate,
      endDate,
      dogs,
      roomTitle,
      pricePerNight: pricePerNight,
    };

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
      <div className="booking-popup-content">
        <h2 className="booking-popup-title">Book: {roomTitle}</h2>
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>

        <div className="date-selection">
          <div className="date-picker">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className={
                showFieldErrors && !startDate ? "field-error-shake" : ""
              }
            />
          </div>
          <div className="date-picker">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              min={endMin}
              max={endMax}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!startDate}
              className={showFieldErrors && !endDate ? "field-error-shake" : ""}
            />
          </div>
        </div>

        <div className="dog-info-section">
          {dogs.map((dog, index) => (
            <div key={index} className="dog-info">
              <h4>Dog #{index + 1}</h4>
              {savedDogs.length > 0 && (
                <div className="saved-dogs-selector">
                  <label>Use a saved dog:</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const selectedDog = JSON.parse(e.target.value);
                        handleSelectSavedDog(index, selectedDog);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Select a dog...</option>
                    {savedDogs.map((savedDog, i) => (
                      <option key={i} value={JSON.stringify(savedDog)}>
                        {savedDog.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="dog-fields-container">
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    id={`dog-name-${index}`}
                    name={`dog-name-${index}`}
                    value={dog.name}
                    onChange={(e) =>
                      handleDogChange(index, "name", e.target.value)
                    }
                    placeholder="Name"
                    className={
                      showFieldErrors && !dog.name.trim()
                        ? "field-error-shake"
                        : ""
                    }
                  />
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    id={`dog-breed-${index}`}
                    name={`dog-breed-${index}`}
                    value={dog.breed}
                    onChange={(e) =>
                      handleDogChange(index, "breed", e.target.value)
                    }
                    placeholder="Breed"
                    className={
                      showFieldErrors && !dog.breed.trim()
                        ? "field-error-shake"
                        : ""
                    }
                  />
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    id={`dog-age-${index}`}
                    name={`dog-age-${index}`}
                    value={dog.age}
                    onChange={(e) =>
                      handleDogChange(index, "age", e.target.value)
                    }
                    placeholder="Age"
                    type="number"
                    className={
                      showFieldErrors && !dog.age.trim()
                        ? "field-error-shake"
                        : ""
                    }
                  />
                </div>
              </div>
              <textarea
                id={`dog-notes-${index}`}
                name={`dog-notes-${index}`}
                value={dog.notes}
                onChange={(e) =>
                  handleDogChange(index, "notes", e.target.value)
                }
                placeholder="Anything we should know?"
              />
            </div>
          ))}
        </div>

        {error && <div className="popup-error">{error}</div>}
        <button
          onClick={handleSave}
          disabled={!isValid || loading}
          className="save-booking-btn"
        >
          {loading ? "Checking..." : "Confirm and Add to Booking"}
        </button>
      </div>
    </div>
  );
}

export default BookingPopup;
