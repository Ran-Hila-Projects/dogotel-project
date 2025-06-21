import React, { useState, useEffect } from "react";
import "./Profile.css";
import CONFIG from "../../config";
import Loader from "../../components/Loader/Loader";
import avatarPlaceholder from "../../assets/images/profile-img.jpg";
import Admin from "../Admin/Admin";

// Default user data structure
const defaultUserData = {
  username: "Loading...",
  birthdate: "Loading...",
  email: "Loading...",
  photo: "", // No photo initially to show placeholder
  isAdmin: false,
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
  const [userData, setUserData] = useState(defaultUserData);
  const [dogs, setDogs] = useState([]);
  const [dogForms, setDogForms] = useState([{ ...emptyDogForm }]);
  const [activeTab, setActiveTab] = useState("profile");
  const [profilePhoto, setProfilePhoto] = useState(avatarPlaceholder);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [dailyRoomsSubscribed, setDailyRoomsSubscribed] = useState(false);
  const [subscribingDaily, setSubscribingDaily] = useState(false);

  // Function to check if user is admin
  const checkAdminStatus = async (userEmail) => {
    try {
      const response = await fetch(CONFIG.API_URL + `auth/check-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.isAdmin || false;
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
    return false;
  };

  // Get current user email from localStorage or auth context
  const getCurrentUserEmail = () => {
    // In a real app, this would come from your auth context/JWT token
    // For now, check localStorage or use a default
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return user.email;
      } catch (e) {
        console.error("Error parsing stored user:", e);
      }
    }

    // Check URL parameter for testing different users
    const urlParams = new URLSearchParams(window.location.search);
    const testUser = urlParams.get("user");
    if (testUser) {
      return testUser;
    }

    // Fallback for development - use a regular user, not admin
    return "user@example.com"; // Regular user for testing
  };

  // Fetch user profile and booking history on mount
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const userEmail = getCurrentUserEmail();
        console.log("Fetching profile for:", userEmail);

        // Check admin status first
        const isAdmin = await checkAdminStatus(userEmail);
        console.log("Admin status:", isAdmin);

        // Fetch user profile (decode the email first to ensure proper format)
        const decodedEmail = decodeURIComponent(userEmail);
        const profileRes = await fetch(
          CONFIG.API_URL + `user/${encodeURIComponent(decodedEmail)}`
        );
        let profileData = null;

        if (profileRes.ok) {
          profileData = await profileRes.json();
          console.log("Profile response:", profileData);
        } else {
          console.log("Profile fetch failed:", profileRes.status);
          // Create default user data if not found
          profileData = {
            success: true,
            user: {
              username: decodedEmail.split("@")[0], // Use email prefix as username
              email: decodedEmail,
              birthdate: "Not provided",
              photo: "",
              isAdmin: isAdmin,
            },
          };
        }

        if (profileData && profileData.success && profileData.user) {
          const updatedUser = {
            ...profileData.user,
            isAdmin: isAdmin,
          };
          setUserData(updatedUser);
          setProfilePhoto(updatedUser.photo || avatarPlaceholder);
        } else {
          // Fallback user data
          const fallbackUser = {
            username: decodedEmail.split("@")[0],
            email: decodedEmail,
            birthdate: "1990-01-01",
            photo: "",
            isAdmin: isAdmin,
          };
          setUserData(fallbackUser);
        }

        // Fetch user's dogs and save to localStorage
        try {
          const dogsRes = await fetch(
            CONFIG.API_URL +
              `api/user/dogs?userEmail=${encodeURIComponent(decodedEmail)}`
          );
          if (dogsRes.ok) {
            const dogsData = await dogsRes.json();
            if (dogsData.success && Array.isArray(dogsData.dogs)) {
              setDogs(dogsData.dogs);
              localStorage.setItem("userDogs", JSON.stringify(dogsData.dogs));
            }
          }
        } catch (dogsErr) {
          console.error("Dogs fetch error:", dogsErr);
        }

        // Fetch booking history only if not admin (admin will see all bookings in admin panel)
        if (!isAdmin) {
          setBookingLoading(true);
          setBookingError("");

          try {
            const bookingRes = await fetch(
              CONFIG.API_URL + `bookings/${encodeURIComponent(decodedEmail)}`
            );
            console.log("Booking history response status:", bookingRes.status);

            if (bookingRes.ok) {
              const bookingData = await bookingRes.json();
              console.log("Booking history data:", bookingData);

              if (bookingData.success && Array.isArray(bookingData.history)) {
                setBookingHistory(bookingData.history);
              } else if (
                bookingData.success &&
                Array.isArray(bookingData.bookings)
              ) {
                setBookingHistory(bookingData.bookings);
              } else {
                console.log("No booking history found");
                setBookingHistory([]);
              }
            } else {
              console.log("Booking history fetch failed:", bookingRes.status);
              setBookingHistory([]);
            }
          } catch (bookingErr) {
            console.error("Booking history error:", bookingErr);
            setBookingError("Could not load booking history");
            setBookingHistory([]);
          }
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        setProfileError("Could not load profile");
        // Set fallback data
        const userEmail = getCurrentUserEmail();
        const decodedEmail = decodeURIComponent(userEmail);
        setUserData({
          username: decodedEmail.split("@")[0],
          email: decodedEmail,
          birthdate: "Not provided",
          photo: "",
          isAdmin: false,
        });
      } finally {
        setBookingLoading(false);
        setProfileLoading(false);
      }
    }

    fetchUserProfile();
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
        const res = await fetch(CONFIG.API_URL + "user/profile-photo", {
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
        const newDog = {
          dogId: data.dog.dogId,
          name: dogForm.name,
          age: dogForm.age,
          breed: dogForm.breed,
          photo: data.dog.photo, // This is now base64 data instead of S3 URL
        };

        setDogs((prev) => [...prev, newDog]);

        // Save to localStorage for use in BookingPopup
        const updatedDogsForStorage = [...dogs, newDog];
        localStorage.setItem("userDogs", JSON.stringify(updatedDogsForStorage));

        // Reset the form to allow adding another dog
        setDogForms([{ ...emptyDogForm }]);
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

  // Daily room subscription functions
  const handleSubscribeToDailyRooms = async () => {
    setSubscribingDaily(true);
    try {
      const response = await fetch(
        CONFIG.API_URL + "notifications/daily-rooms/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: userData.email }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDailyRoomsSubscribed(true);
        alert(
          "✅ Successfully subscribed to daily room availability notifications! You will receive emails at 8 AM UTC daily."
        );
      } else {
        alert(
          "❌ Failed to subscribe to daily notifications. Please try again."
        );
      }
    } catch (error) {
      console.error("Error subscribing to daily room notifications:", error);
      alert("❌ Error subscribing to daily notifications. Please try again.");
    } finally {
      setSubscribingDaily(false);
    }
  };

  const handleUnsubscribeFromDailyRooms = async () => {
    setSubscribingDaily(true);
    try {
      const response = await fetch(
        CONFIG.API_URL + "notifications/daily-rooms/unsubscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: userData.email }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDailyRoomsSubscribed(false);
        alert("✅ Successfully unsubscribed from daily room notifications.");
      } else {
        alert("❌ Failed to unsubscribe. Please try again.");
      }
    } catch (error) {
      console.error(
        "Error unsubscribing from daily room notifications:",
        error
      );
      alert("❌ Error unsubscribing. Please try again.");
    } finally {
      setSubscribingDaily(false);
    }
  };

  if (profileLoading) {
    return <Loader />;
  }

  // If user is admin, show admin dashboard instead of regular profile
  if (userData.isAdmin) {
    return (
      <Admin
        userName={userData.username}
        userEmail={userData.email}
        isAdmin={true}
      />
    );
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
        <div className="profile-content">
          {/* User Profile Section */}
          <section className="user-profile-section">
            <div className="user-profile-card">
              <div className="user-photo-container">
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
                <h2>Personal Information</h2>
                <div className="user-info-grid">
                  <div className="info-item">
                    <label>Name:</label>
                    <span>
                      {userData.firstName} {userData.lastName}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Birthdate:</label>
                    <span>{userData.birthdate}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{userData.email}</span>
                  </div>
                  {userData.isAdmin && (
                    <div className="info-item admin-badge">
                      <label>Role:</label>
                      <span style={{ color: "#e74c3c", fontWeight: "bold" }}>
                        Administrator
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Dog Management Section */}
          <section className="dog-management-section">
            <h2>🐕 My Dogs</h2>
            <p className="section-description">
              Add your furry friends to make booking easier and get personalized
              recommendations.
            </p>

            {dogForms.map((dogForm, idx) => (
              <form
                className="dog-form"
                key={idx}
                onSubmit={(e) => handleDogSave(e, idx)}
              >
                <div className="dog-form-grid">
                  <div className="dog-photo-section">
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
                          width: 100,
                          height: 100,
                          borderRadius: 12,
                          objectFit: "cover",
                          margin: "10px 0",
                          border: "2px solid #e5d8c7",
                        }}
                      />
                    )}
                  </div>

                  <div className="dog-details-section">
                    <div className="form-row">
                      <label>
                        Name:
                        <input
                          name="name"
                          value={dogForm.name}
                          onChange={(e) => handleDogFormChange(e, idx)}
                          required
                          className="profile-input"
                          placeholder="Enter dog's name"
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
                          placeholder="Age in years"
                        />
                      </label>
                    </div>

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
                            : "Enter breed or upload photo for auto-detection"
                        }
                      />
                    </label>

                    {dogForm.uploading && (
                      <div className="breed-detection-status">
                        🔍 Identifying breed...
                      </div>
                    )}
                    {dogForm.breedDetected && (
                      <div className="breed-detected">
                        {dogForm.breedDetected}
                      </div>
                    )}
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
                  </div>
                </div>
              </form>
            ))}

            {dogs.length > 0 && (
              <div className="my-dogs-list">
                <h3>Your Dogs</h3>
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
                    <div className="dog-info">
                      <div className="dog-name">{dog.name}</div>
                      <div className="dog-breed">{dog.breed}</div>
                      <div className="dog-age">{dog.age} years old</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Daily Room Notifications Section */}
          <section className="notifications-section">
            <div className="notification-card">
              <div className="notification-header">
                <h2>📧 Daily Room Notifications</h2>
                <p className="notification-description">
                  Get notified every morning at 8 AM UTC about available rooms
                  for the day.
                </p>
              </div>

              <div className="notification-content">
                {dailyRoomsSubscribed ? (
                  <div className="subscription-status">
                    <div className="status-indicator">
                      <span className="status-icon">✅</span>
                      <span className="status-text">
                        You're subscribed to daily room notifications
                      </span>
                    </div>
                    <button
                      onClick={handleUnsubscribeFromDailyRooms}
                      disabled={subscribingDaily}
                      className="unsubscribe-btn"
                      style={{
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        padding: "10px 20px",
                        fontSize: "0.9em",
                        fontWeight: "600",
                        cursor: subscribingDaily ? "not-allowed" : "pointer",
                        transition: "background 0.2s, color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!subscribingDaily)
                          e.target.style.backgroundColor = "#c82333";
                      }}
                      onMouseLeave={(e) => {
                        if (!subscribingDaily)
                          e.target.style.backgroundColor = "#dc3545";
                      }}
                    >
                      {subscribingDaily ? "Processing..." : "Unsubscribe"}
                    </button>
                  </div>
                ) : (
                  <div className="subscription-action">
                    <button
                      onClick={handleSubscribeToDailyRooms}
                      disabled={subscribingDaily}
                      className="subscribe-btn"
                      style={{
                        backgroundColor: "#bb7c48",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px 24px",
                        fontSize: "1em",
                        fontWeight: "600",
                        cursor: subscribingDaily ? "not-allowed" : "pointer",
                        transition: "background 0.2s, color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!subscribingDaily)
                          e.target.style.backgroundColor = "#3b1d0f";
                      }}
                      onMouseLeave={(e) => {
                        if (!subscribingDaily)
                          e.target.style.backgroundColor = "#bb7c48";
                      }}
                      title="Subscribe to receive notifications of which rooms are available for the day."
                    >
                      {subscribingDaily
                        ? "Subscribing..."
                        : "📧 Subscribe to Daily Room Updates"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "history" && (
        <div className="booking-history-section">
          <h2 className="booking-history-title">Booking History</h2>
          {bookingLoading && (
            <div className="loading-message">Loading booking history...</div>
          )}
          {bookingError && <div className="error-message">{bookingError}</div>}
          {bookingHistory.length === 0 && !bookingLoading && !bookingError && (
            <div className="empty-state">
              <p>No booking history found.</p>
              <p>Your future bookings will appear here.</p>
            </div>
          )}
          {bookingHistory.length > 0 && (
            <div className="table-container">
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
                    <tr key={booking.bookingId || idx}>
                      <td>{booking.room?.roomTitle || "-"}</td>
                      <td>{booking.bookingId || "-"}</td>
                      <td>
                        {booking.createdAt && booking.room?.endDate
                          ? `${new Date(
                              booking.createdAt
                            ).toLocaleDateString()} to ${new Date(
                              booking.room.endDate
                            ).toLocaleDateString()}`
                          : "-"}
                      </td>
                      <td>
                        {Array.isArray(booking.room?.dogs)
                          ? booking.room.dogs.map((d) => d.name).join(", ")
                          : "-"}
                      </td>
                      <td>{booking.dining?.title || "-"}</td>
                      <td>
                        {Array.isArray(booking.services)
                          ? booking.services
                              .map((s) => s.title || s.name)
                              .join(", ")
                          : "-"}
                      </td>
                      <td>${booking.totalPrice || "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;
