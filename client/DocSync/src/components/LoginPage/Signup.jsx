import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const res = await axios.post("http://localhost:8000/signup", {
        username,
        password,
      });

      // handle errors
      if (res.data.status === "exists") {
        setErrorMessage("User already exists. Please log in.");
      } else if (res.data.status === "created") {
        navigate("/", { state: { id: username } });
      }
    } catch (error) {
      setErrorMessage("An error occurred during signup. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="login">
      <h2>Signup</h2>
      <form onSubmit={submit}>
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
        <div>
          <button type="submit">Signup</button>
        </div>
      </form>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}{" "}
      {/* Display error message if any */}
      <p>OR</p>
      <Link to="/">Login Page</Link>
    </div>
  );
}
