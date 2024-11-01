import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent the default form submission
    setErrorMessage(""); // Reset any previous error message

    try {
      // Send login request to the backend
      const response = await axios.post(
        "http://localhost:8000/",
        { username, password },
        { withCredentials: true }
      );

      // Check if login was successful
      if (response.data.status === "success") {
        navigate("/home", { state: { username: response.data.username } }); // Pass username to the next route
      } else {
        setErrorMessage("Login failed: " + response.data.status);
      }
    } catch (error) {
      // error handling
      if (error.response) {
        switch (error.response.status) {
          case 401:
            setErrorMessage(
              "Invalid credentials. Please check your username and password."
            ); // Unauthorized
            break;
          case 404:
            setErrorMessage("User not found. Please check your username."); // Not Found
            break;
          case 500:
            setErrorMessage("Server error. Please try again later."); // Server Error
            break;
          default:
            setErrorMessage("An error occured. Please try again.");
        }
      } else {
        // Something happened in setting up the request that triggered an Error
        setErrorMessage("Error: " + error.message);
      }
    }
  };

  return (
    <div className="login">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
        />
        <input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <button type="submit">Login</button>
      </form>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}{" "}
      {/* Display error message if any */}
      <p>OR</p>
      <Link to="/signup">Signup Page</Link>
    </div>
  );
}
