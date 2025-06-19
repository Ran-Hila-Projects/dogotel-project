import React, { useState } from "react";
import "./Profile.css";
import CONFIG from "../../config";

// Dummy user data
const userData = {
  username: "John Doe",
  birthdate: "1990-01-01",
  email: "john.doe@example.com",
  photo: "https://via.placeholder.com/150",
};

// Dummy booking history
const bookingHistory = [
  {
    bookingNumber: "B001",
    dates: "2025-06-15 to 2025-06-18",
    dogs: ["Rocky"],
    diningSelection: "Premium",
    servicesSelection: "Grooming",
    totalPrice: 250,
  },
  {
    bookingNumber: "B002",
    dates: "2025-07-10 to 2025-07-13",
    dogs: ["Max"],
    diningSelection: "Standard",
    servicesSelection: "Training",
    totalPrice: 300,
  },
];

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

  const handleDogPhotoChange = async (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    updateDogForm(idx, { uploading: true, error: "" });
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      updateDogForm(idx, { photo: base64, uploading: true, error: "" });
      try {
        const res = await fetch(
          CONFIG.API_URL + "api/rekognition/detect-breed",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 }),
          }
        );
        const data = await res.json();
        if (data.success && data.breed) {
          updateDogForm(idx, { breed: data.breed, uploading: false });
        } else {
          updateDogForm(idx, {
            uploading: false,
            error: "Could not identify breed",
          });
        }
      } catch (err) {
        updateDogForm(idx, {
          uploading: false,
          error: "Error identifying breed",
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
            <img
              src={userData.photo}
              alt={userData.username}
              className="user-photo"
            />
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
                  />
                </label>
                <label>
                  Breed:
                  <input
                    name="breed"
                    value={dogForm.breed}
                    onChange={(e) => handleDogFormChange(e, idx)}
                    required
                    readOnly={!!dogForm.photo}
                  />
                </label>
                {dogForm.uploading && <div>Identifying breed...</div>}
                {dogForm.error && (
                  <div className="dog-form-error">{dogForm.error}</div>
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
          <table className="booking-history-table">
            <thead>
              <tr>
                <th>Booking Number</th>
                <th>Dates</th>
                <th>Dogs</th>
                <th>Dining Selection</th>
                <th>Services Selection</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              {bookingHistory.map((booking) => (
                <tr key={booking.bookingNumber}>
                  <td>{booking.bookingNumber}</td>
                  <td>{booking.dates}</td>
                  <td>{booking.dogs.join(", ")}</td>
                  <td>{booking.diningSelection}</td>
                  <td>{booking.servicesSelection}</td>
                  <td>${booking.totalPrice}</td>
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
