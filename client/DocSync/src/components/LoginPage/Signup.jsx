import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const res = await axios.post(`${backendUrl}/signup`, {
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
      <h2 className="loginTitle">Signup</h2>
      {errorMessage && <div className="loginError">{errorMessage}</div>}
      {/* Display error message if any */}
      <form className="loginForm" onSubmit={submit}>
        <input
          className="loginInput"
          type="text"
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
        />
        <input
          className="loginInput"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <div>
          <button className="loginButton" type="submit">
            Signup
          </button>
        </div>
      </form>
      <div className="loginText">OR</div>
      <Link className="loginLink" to="/">
        Login Page
      </Link>
    </div>
  );
}
