import React, { useState, useEffect } from "react";
import "./general.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import HomePage from "./pages/HomePage/HomePage";
import RoomsPage from "./pages/Rooms/Rooms";
import DiningPage from "./pages/Dining/Dining";
import ServicesPage from "./pages/Services/Services";
import ARoomPage from "./pages/ARoom/ARoom";
import CartPage from "./pages/Cart/Cart";
import NotFound from "./404";
import AdminPage from "./pages/Admin/Admin";
import ProfilePage from "./pages/Profile/Profile";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";

function RequireAuth({ isLoggedIn, children }) {
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // On app load, check for accessToken and user info
    const accessToken =
      localStorage.getItem("access_token") ||
      localStorage.getItem("accessToken");
    const storedName = localStorage.getItem("userName");
    if (accessToken) {
      setIsLoggedIn(true);
      if (storedName) setUserName(storedName);
    } else {
      setIsLoggedIn(false);
      setUserName("");
    }
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName("");
    localStorage.clear();
  };

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar
          isLoggedIn={isLoggedIn}
          userName={userName}
          onLogout={handleLogout}
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/rooms"
            element={<RoomsPage isLoggedIn={isLoggedIn} />}
          />
          <Route
            path="/dining"
            element={<DiningPage isLoggedIn={isLoggedIn} />}
          />
          <Route
            path="/services"
            element={<ServicesPage isLoggedIn={isLoggedIn} />}
          />
          <Route path="/aroom" element={<ARoomPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth isLoggedIn={isLoggedIn}>
                <AdminPage userName={userName} />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth isLoggedIn={isLoggedIn}>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/login"
            element={
              <Login setIsLoggedIn={setIsLoggedIn} setUserName={setUserName} />
            }
          />
          <Route
            path="/signup"
            element={
              <Signup setIsLoggedIn={setIsLoggedIn} setUserName={setUserName} />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
