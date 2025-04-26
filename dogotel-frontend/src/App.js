import React from "react";
import "./general.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import HomePage from "./pages/HomePage/HomePage";
import RoomsPage from "./pages/Rooms/Rooms";
import DiningPage from "./pages/Dining/Dining";
import ServicesPage from "./pages/Services/Services";
import ARoomPage from "./pages/ARoom/ARoom";

function App() {
  const isLoggedIn = false;

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar isLoggedIn={isLoggedIn} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Later add more pages here */}
          {/* <Route path="/rooms" element={<RoomsPage />} /> */}
          <Route path="/dining" element={<DiningPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/aroom" element={<ARoomPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
