import React, { useState } from "react";
import "./general.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const userName = "admin";

  const handleLogout = () => {
    setIsLoggedIn(false);
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
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/dining" element={<DiningPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/aroom" element={<ARoomPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/admin" element={<AdminPage userName={userName} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
