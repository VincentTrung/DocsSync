import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("Guest"); // Default username
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const response = await axios.get("http://localhost:8000/session", {
          withCredentials: true, // Include cookies with the request
        });
        setUsername(response.data.username); // Set the username from the response
      } catch (error) {
        if (error.response) {
          switch (error.response.status) {
            case 401:
              setErrorMessage("Unauthorized access. Please log in."); // Not authenticated
              navigate("/"); // Redirect to login if not authenticated
              break;
            case 500:
              setErrorMessage("Server error. Please try again later."); // Server Error
              break;
            default:
              setErrorMessage("An error occurred. Please try again.");
          }
        } else {
          setErrorMessage("Error: " + error.message);
        }
      }
    };

    fetchUsername();
  }, [navigate]);

  return (
    <div>
      <h1>Welcome, {username}!</h1>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
    </div>
  );
}
