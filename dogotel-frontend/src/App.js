import React from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <HomePage />
      </div>
    </BrowserRouter>
  );
}

export default App;
