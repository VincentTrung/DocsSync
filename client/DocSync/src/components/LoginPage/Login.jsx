import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e) {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:8000/", {
        username,
        password,
      });

      if (res.data.status === "success") {
        // Successful login, navigate to home page
        navigate("/home", { state: { id: username } });
      } else if (res.data.status === "notfound") {
        alert("User not found. Please sign up.");
      } else if (res.data.status === "invalid") {
        alert("Incorrect password.");
      }
    } catch (error) {
      alert("An error occurred during login. Please try again.");
      console.error(error);
    }
  }

  return (
    <div className="login">
      <h1>Login Page</h1>
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
        <button type="submit">Login</button>
      </form>
      <p>OR</p>
      <Link to="/signup">Signup Page</Link>
    </div>
  );
}
