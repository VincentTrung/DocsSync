import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import axios from "axios";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Guest");
  const [errorMessage, setErrorMessage] = useState("");
  const [ownerDocuments, setOwnerDocuments] = useState([]);
  const [sharedDocuments, setSharedDocuments] = useState([]);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const userResponse = await axios.get("http://localhost:8000/session", {
          withCredentials: true,
        });
        setUsername(userResponse.data.username);

        const docResponse = await axios.get("http://localhost:8000/documents", {
          withCredentials: true,
        });

        const ownerDocs = docResponse.data.filter(
          (doc) => doc.owner === userResponse.data.username
        );
        const sharedDocs = docResponse.data.filter((doc) =>
          doc.sharedUsers.includes(userResponse.data.username)
        );

        setOwnerDocuments(ownerDocs);
        setSharedDocuments(sharedDocs);
      } catch (error) {
        if (error.response) {
          switch (error.response.status) {
            case 401:
              setErrorMessage("Unauthorized access. Please log in.");
              navigate("/");
              break;
            case 500:
              setErrorMessage("Server error. Please try again later.");
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

  // Handle Creating a new document (with unique id) and then redirecting to it
  const handleCreateNewDocument = () => {
    const newDocId = uuidV4();
    navigate(`/documents/${newDocId}`);
  };

  // Handle signout
  // Documentation for button event handling https://react.dev/learn/responding-to-events#reading-props-in-event-handlers
  function SignoutButton() {
    async function onSignout() {
      const response = await axios.get("http://localhost:8000/signout", {
        withCredentials: true
      })
      .then(response => {
        console.log("Signed out successfully: ", response);
        navigate("/"); //put in backend?
      })
      .catch(error => {
        console.log("Error signing out: ", error);
      });
    }

    return (
      <button className="signoutButton" onClick={onSignout}>Sign Out</button>
    );
  }

  return (
    <div>
      <div className="homeHeader">
        <h1>Welcome, {username}!</h1>
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        <SignoutButton />
      </div>
      <div className="doc-create-container">
        <div className="doc-create-inner">
          <div className="start-doc" onClick={handleCreateNewDocument}>
            <h3>Start a new Document</h3>
          </div>
        </div>
      </div>

      <h2>Your Documents:</h2>
      <div className="box-container">
        {ownerDocuments.length > 0 ? (
          ownerDocuments.map((doc) => (
            <Link
              to={`/documents/${doc._id}`}
              key={doc._id}
              style={{ textDecoration: "none" }}
            >
              <div className="boxStyle">
                <h3>{doc.title || "Untitled Document"}</h3>
                <p>Owner: {doc.owner}</p>
              </div>
            </Link>
          ))
        ) : (
          <p>No documents found.</p>
        )}
      </div>

      <h2>Shared Documents:</h2>
      <div className="box-container">
        {sharedDocuments.length > 0 ? (
          sharedDocuments.map((doc) => (
            <Link
              to={`/documents/${doc._id}`}
              key={doc._id}
              style={{ textDecoration: "none" }}
            >
              <div className="boxStyle">
                <h3>{doc.title || "Untitled Document"}</h3>
                <p>Shared by: {doc.owner}</p>
              </div>
            </Link>
          ))
        ) : (
          <p>No shared documents found.</p>
        )}
      </div>
    </div>
  );
}
