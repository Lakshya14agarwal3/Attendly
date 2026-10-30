// React frontend file: application entry point.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Starts the React application inside the HTML element with id "root".
createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);
