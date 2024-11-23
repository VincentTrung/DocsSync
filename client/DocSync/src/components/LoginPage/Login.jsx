import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Login.css";
import { GoogleLogin } from '@react-oauth/google';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

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
        `${backendUrl}/`,
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
  
  // Following code from: https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
  function decodeToken(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  
    return JSON.parse(jsonPayload);
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    console.log("login with goog success");

    const googleToken = credentialResponse.credential;
    const user = decodeToken(googleToken);
    console.log("user email: ", user.email);

    try {
      const response = await axios.post(
        `${backendUrl}/googleSignin`,
        { user },
        { withCredentials: true }
      );

      if(response.data.status == "success" || response.data.status == "created") {
        console.log("session username: ", response.data.username);
        navigate("/home", { state: { username: response.data.username } }); // Pass username to the next route
      } else {
        setErrorMessage("Login failed, " + response.data.message);
      }
    }
    catch (error) {
      // setErrorMessage(error.response.message);
      setErrorMessage(error.message);
    }
  };

  const handleGoogleFail = () => {
    setErrorMessage("Error logging in with Google. Please try again later.");
  }

  return (
    <div className="login">
      <h2 className="loginTitle">Login</h2>
      {errorMessage && <div className="loginError">{errorMessage}</div>}
      {/* Display error message if any */}
      <div>
        <form className="loginForm" onSubmit={handleLogin}>
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
              Login
            </button>
          </div>
        </form>
        <div>
        <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFail}
          />
        </div>
      </div>
      <div className="loginText">OR</div>
      <Link className="loginLink" to="/signup">
        Signup Page
      </Link>
    </div>
  );
}
