import React, { useState, useEffect } from "react";
import "./Profile.css";
import CONFIG from "../../config";
import Loader from "../../components/Loader/Loader";
import avatarPlaceholder from "../../assets/images/profile-img.jpg";

// Dummy user data
const userData = {
  username: "John Doe",
  birthdate: "1990-01-01",
  email: "john.doe@example.com",
  photo: "", // No photo initially to show placeholder
};

// Booking history state will be fetched from server

const emptyDogForm = {
  name: "",
  age: "",
  breed: "",
  photo: "",
  uploading: false,
  error: "",
};

function Profile() {
  const [dogs, setDogs] = useState([]);
  const [dogForms, setDogForms] = useState([{ ...emptyDogForm }]);
  const [activeTab, setActiveTab] = useState("profile");
  const [profilePhoto, setProfilePhoto] = useState(
    userData.photo || avatarPlaceholder
  );
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch booking history from server on mount
  useEffect(() => {
    async function fetchBookingHistory() {
      setBookingLoading(true);
      setBookingError("");
      try {
        const res = await fetch(
          CONFIG.API_URL + `api/bookings/${userData.email}`
        );
        if (!res.ok) throw new Error("Failed to fetch booking history");
        const data = await res.json();
        if (Array.isArray(data)) {
          setBookingHistory(data);
        } else {
          setBookingHistory([]);
        }
      } catch (err) {
        setBookingError("Could not load booking history");
        setBookingHistory([]);
      } finally {
        setBookingLoading(false);
        setProfileLoading(false);
      }
    }
    fetchBookingHistory();
  }, []);

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileUploading(true);
    setProfileError("");
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      try {
        // Save to server
        const res = await fetch(CONFIG.API_URL + "api/user/profile-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userData.email, photo: base64 }),
        });
        const data = await res.json();
        if (data.success && data.photoUrl) {
          setProfilePhoto(data.photoUrl);
        } else {
          setProfileError(data.error || "Failed to upload profile photo");
        }
      } catch (err) {
        setProfileError("Failed to upload profile photo");
      } finally {
        setProfileUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDogPhotoChange = async (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      updateDogForm(idx, { error: "Please select a valid image file" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      updateDogForm(idx, { error: "Image must be smaller than 5MB" });
      return;
    }

    updateDogForm(idx, { uploading: true, error: "", breedDetected: "" });
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      updateDogForm(idx, { photo: base64, uploading: true, error: "" });

      try {
        console.log("Sending image to Rekognition...");
        const res = await fetch(
          CONFIG.API_URL + "api/rekognition/detect-breed",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 }),
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("Rekognition response:", data);

        if (data.success && data.breed) {
          updateDogForm(idx, {
            breed: data.breed,
            uploading: false,
            breedDetected: `✅ Detected: ${data.breed} (${data.confidence}% confidence)`,
            error: "",
          });
        } else if (data.error) {
          updateDogForm(idx, {
            uploading: false,
            error: data.error,
            breedDetected: "",
          });
        } else {
          updateDogForm(idx, {
            uploading: false,
            error: "Could not identify breed. Please enter manually.",
            breedDetected: "",
          });
        }
      } catch (err) {
        console.error("Rekognition error:", err);
        updateDogForm(idx, {
          uploading: false,
          error: "Error analyzing image. Please enter breed manually.",
          breedDetected: "",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDogFormChange = (e, idx) => {
    const { name, value } = e.target;
    updateDogForm(idx, { [name]: value });
  };

  const updateDogForm = (idx, changes) => {
    setDogForms((forms) =>
      forms.map((form, i) => (i === idx ? { ...form, ...changes } : form))
    );
  };

  const handleDogSave = async (e, idx) => {
    e.preventDefault();
    const dogForm = dogForms[idx];
    if (!dogForm.name || !dogForm.age || !dogForm.breed || !dogForm.photo) {
      updateDogForm(idx, { error: "All fields are required" });
      return;
    }
    try {
      const res = await fetch(CONFIG.API_URL + "api/user/dogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dogForm.name,
          age: dogForm.age,
          breed: dogForm.breed,
          photo: dogForm.photo,
          userEmail: userData.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDogs((prev) => [
          ...prev,
          {
            name: dogForm.name,
            age: dogForm.age,
            breed: dogForm.breed,
            photo: dogForm.photo,
          },
        ]);
        setDogForms((forms) => forms.filter((_, i) => i !== idx));
        if (dogForms.length === 1) setDogForms([{ ...emptyDogForm }]);
      } else {
        updateDogForm(idx, { error: data.error || "Failed to save dog" });
      }
    } catch (err) {
      updateDogForm(idx, { error: "Failed to save dog" });
    }
  };

  const handleAddAnotherDog = () => {
    setDogForms((forms) => [...forms, { ...emptyDogForm }]);
  };

  if (profileLoading) {
    return <Loader />;
  }

  return (
    <div className="profile-page">
      <h1>Profile</h1>
      <div className="profile-tabs">
        <button
          className={activeTab === "profile" ? "active" : ""}
          onClick={() => setActiveTab("profile")}
        >
          Profile Info
        </button>
        <button
          className={activeTab === "history" ? "active" : ""}
          onClick={() => setActiveTab("history")}
        >
          Booking History
        </button>
      </div>
      {activeTab === "profile" && (
        <>
          <div className="user-info-profile">
            <div style={{ position: "relative" }}>
              <img
                src={profilePhoto}
                alt={userData.username}
                className="user-photo"
              />
              <label className="profile-photo-upload-btn">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleProfilePhotoChange}
                  disabled={profileUploading}
                />
                <span>Change Photo</span>
              </label>
              {profileUploading && (
                <div className="profile-photo-uploading">Uploading...</div>
              )}
              {profileError && (
                <div className="profile-photo-error">{profileError}</div>
              )}
            </div>
            <div className="user-details">
              <p>
                <strong>Username:</strong> {userData.username}
              </p>
              <p>
                <strong>Birthdate:</strong> {userData.birthdate}
              </p>
              <p>
                <strong>Email:</strong> {userData.email}
              </p>
            </div>
          </div>
          {/* Dog Management Section */}
          <section className="dog-management-section">
            <h2>My Dogs</h2>
            {dogForms.map((dogForm, idx) => (
              <form
                className="dog-form"
                key={idx}
                onSubmit={(e) => handleDogSave(e, idx)}
              >
                <label>
                  Dog Photo:
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleDogPhotoChange(e, idx)}
                    className="profile-input"
                  />
                </label>
                {dogForm.photo && (
                  <img
                    src={dogForm.photo}
                    alt="Dog"
                    className="dog-preview"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 10,
                      objectFit: "cover",
                      margin: "10px 0",
                    }}
                  />
                )}
                <label>
                  Name:
                  <input
                    name="name"
                    value={dogForm.name}
                    onChange={(e) => handleDogFormChange(e, idx)}
                    required
                    className="profile-input"
                  />
                </label>
                <label>
                  Age:
                  <input
                    name="age"
                    value={dogForm.age}
                    onChange={(e) => handleDogFormChange(e, idx)}
                    type="number"
                    min="0"
                    required
                    className="profile-input"
                  />
                </label>
                <label>
                  Breed:
                  <input
                    name="breed"
                    value={dogForm.breed}
                    onChange={(e) => handleDogFormChange(e, idx)}
                    required
                    className="profile-input"
                    placeholder={
                      dogForm.uploading
                        ? "Analyzing image..."
                        : "Enter breed or upload photo"
                    }
                  />
                </label>
                {dogForm.uploading && (
                  <div
                    style={{
                      color: "#3498db",
                      fontSize: "14px",
                      margin: "5px 0",
                    }}
                  >
                    🔍 Identifying breed...
                  </div>
                )}
                {dogForm.breedDetected && (
                  <div
                    style={{
                      color: "#27ae60",
                      fontSize: "14px",
                      margin: "5px 0",
                    }}
                  >
                    {dogForm.breedDetected}
                  </div>
                )}
                {dogForm.error && (
                  <div
                    className="dog-form-error"
                    style={{
                      color: "#e74c3c",
                      fontSize: "14px",
                      margin: "5px 0",
                    }}
                  >
                    {dogForm.error}
                  </div>
                )}
                <div className="dog-form-btn-row">
                  <button
                    type="submit"
                    className="save-dog-btn"
                    disabled={dogForm.uploading}
                  >
                    Save Dog
                  </button>
                </div>
              </form>
            ))}
            <button
              className="add-another-dog-btn"
              onClick={handleAddAnotherDog}
            >
              Add Another Dog
            </button>
            <div className="my-dogs-list">
              {dogs.map((dog, idx) => (
                <div key={idx} className="dog-card">
                  <img
                    src={dog.photo}
                    alt={dog.name}
                    className="dog-preview"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 10,
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <strong>Name:</strong> {dog.name}
                  </div>
                  <div>
                    <strong>Breed:</strong> {dog.breed}
                  </div>
                  <div>
                    <strong>Age:</strong> {dog.age}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {activeTab === "history" && (
        <>
          <h2 className="booking-history-title">Booking History</h2>
          {bookingLoading && <div>Loading booking history...</div>}
          {bookingError && (
            <div style={{ color: "#e74c3c" }}>{bookingError}</div>
          )}
          <table className="booking-history-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Booking Number</th>
                <th>Dates</th>
                <th>Dogs</th>
                <th>Dining Selection</th>
                <th>Services Selection</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              {bookingHistory.map((booking, idx) => (
                <tr key={booking.bookingNumber || idx}>
                  <td>
                    {booking.roomName ||
                      booking.roomTitle ||
                      booking.room ||
                      "-"}
                  </td>
                  <td>
                    {booking.bookingNumber || booking.id || booking._id || "-"}
                  </td>
                  <td>
                    {booking.dates
                      ? booking.dates
                      : booking.startDate && booking.endDate
                      ? `${booking.startDate} to ${booking.endDate}`
                      : "-"}
                  </td>
                  <td>
                    {Array.isArray(booking.dogs)
                      ? booking.dogs
                          .map((d) => (typeof d === "string" ? d : d.name))
                          .join(", ")
                      : "-"}
                  </td>
                  <td>{booking.diningSelection || booking.dining || "-"}</td>
                  <td>
                    {booking.servicesSelection ||
                      (Array.isArray(booking.services)
                        ? booking.services.map((s) => s.name || s).join(", ")
                        : "-")}
                  </td>
                  <td>
                    $
                    {booking.totalPrice ||
                      booking.price ||
                      booking.total ||
                      "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default Profile;
