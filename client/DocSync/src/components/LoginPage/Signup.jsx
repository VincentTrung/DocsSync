import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e) {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:8000/signup", {
        username,
        password,
      });

      if (res.data.status === "exists") {
        alert("User already exists. Please log in.");
      } else if (res.data.status === "created") {
        // Successful signup, navigate to home page
        navigate("/home", { state: { id: username } });
      }
    } catch (error) {
      alert("An error occurred during signup. Please try again.");
      console.error(error);
    }
  }

  return (
    <div className="signup">
      <h1>Signup Page</h1>
      <form onSubmit={submit}>
        <input
          type="text"
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />
        <input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Signup</button>
      </form>
      <p>OR</p>
      <Link to="/">Login Page</Link>
    </div>
  );
}
