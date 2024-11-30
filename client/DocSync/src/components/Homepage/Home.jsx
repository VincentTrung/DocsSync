import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Home.css";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const docLimit = 10;

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Guest");
  const [errorMessage, setErrorMessage] = useState("");
  // arr of docs
  const [ownerDocuments, setOwnerDocuments] = useState([]);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  // Sharing documents
  const [sharedUser, setSharedUser] = useState("");
  const [currentDoc, setCurrentDoc] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentSharedUsers, setCurrentSharedUsers] = useState([]); // Tracks shared users for selected doc
  // Keep track of docs page
  const [ownerDocumentsPage, setOwnerDocumentsPage] = useState(1);
  const [sharedDocumentsPage, setSharedDocumentsPage] = useState(1);
  // Determines whether to display doc nav buttons
  const [hasMoreOwnerDocuments, setHasMoreOwnerDocuments] = useState(true);
  const [hasMoreSharedDocuments, setHasMoreSharedDocuments] = useState(true);

  // Fetching documents with pagination
  const fetchDocuments = async (ownerPage, sharedPage) => {
    const limit = docLimit + 1;

    try {
      const userResponse = await axios.get(`${backendUrl}/session`, {
        withCredentials: true,
      });
      setUsername(userResponse.data.username);

      // Fetch owner documents
      const ownerDocsResponse = await axios.get(`${backendUrl}/documents`, {
        params: { page: ownerPage },
        withCredentials: true,
      });
      const ownerDocs = ownerDocsResponse.data.filter(
        (doc) => doc.owner == userResponse.data.username
      );
      setOwnerDocuments(ownerDocs);
      setHasMoreOwnerDocuments(ownerDocs.length == limit); // Disable if less than limit

      // Fetch shared documents
      const sharedDocsResponse = await axios.get(`${backendUrl}/documents`, {
        params: { page: sharedPage },
        withCredentials: true,
      });
      const sharedDocs = sharedDocsResponse.data.filter((doc) =>
        doc.sharedUsers.includes(userResponse.data.username)
      );
      setSharedDocuments(sharedDocs);
      setHasMoreSharedDocuments(sharedDocs.length == limit); // Disable if less than limit
    } catch (error) {
      console.log(error);
    }
  };

  // Handle what page the client is on, update based on type
  const handleNextPage = (type) => {
    if (type == "owner") {
      setOwnerDocumentsPage((prevPage) => prevPage + 1);
    } else if (type == "shared") {
      setSharedDocumentsPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = (type) => {
    if (type == "owner" && ownerDocumentsPage > 1) {
      setOwnerDocumentsPage((prevPage) => prevPage - 1);
    } else if (type == "shared" && sharedDocumentsPage > 1) {
      setSharedDocumentsPage((prevPage) => prevPage - 1);
    }
  };

  // Call fetchDocuments with the current page numbers
  useEffect(() => {
    fetchDocuments(ownerDocumentsPage, sharedDocumentsPage);
  }, [ownerDocumentsPage, sharedDocumentsPage]);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const userResponse = await axios.get(`${backendUrl}/session`, {
          withCredentials: true,
        });
        setUsername(userResponse.data.username);

        const docResponse = await axios.get(`${backendUrl}/documents`, {
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

  // Handle Create New Document
  const handleCreateNewDocument = async () => {
    try {
      // Send a request to create a new document on the backend
      const response = await axios.post(
        `${backendUrl}/documents`,
        {},
        { withCredentials: true }
      );

      const docId = response.data._id;
      navigate(`/documents/${docId}`);
    } catch (error) {
      console.error("Error creating new document:", error);
    }
  };

  // Handle deleting a document
  const handleDeleteDocument = async (docId, type) => {
    try {
      const response = await axios.delete(`${backendUrl}/documents/${docId}`, {
        withCredentials: true,
      });

      // Remove the document from the correct list and update pagination
      if (type == "owner") {
        const updatedOwnerDocs = ownerDocuments.filter(
          (doc) => doc._id !== docId
        );
        setOwnerDocuments(updatedOwnerDocs);

        // Check if we need to adjust the page after deletion
        if (updatedOwnerDocs.length == 0 && ownerDocumentsPage > 1) {
          setOwnerDocumentsPage((prevPage) => prevPage - 1);
        } else {
          fetchDocuments(ownerDocumentsPage, sharedDocumentsPage);
        }
      } else if (type == "shared") {
        const updatedSharedDocs = sharedDocuments.filter(
          (doc) => doc._id !== docId
        );
        setSharedDocuments(updatedSharedDocs);

        if (updatedSharedDocs.length == 0 && sharedDocumentsPage > 1) {
          setSharedDocumentsPage((prevPage) => prevPage - 1);
        } else {
          fetchDocuments(ownerDocumentsPage, sharedDocumentsPage);
        }
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      setErrorMessage("An error occurred while deleting the document.");
    }
  };

  // Handle opening the modal to add shared users
  const handleOpenModal = (doc) => {
    setCurrentDoc(doc);
    setCurrentSharedUsers(doc.sharedUsers); // Display current shared users
    setShowModal(true);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSharedUser("");
  };

  // SharedUsers Model stuff
  const addSharedUser = async () => {
    if (!sharedUser) return;

    try {
      const response = await axios.post(
        `${backendUrl}/documents/${currentDoc._id}/addSharedUser`,
        { username: sharedUser },
        { withCredentials: true }
      );
      setCurrentSharedUsers([...currentSharedUsers, sharedUser]); // Update list of shared users
      setSharedUser(""); // Clear input field
    } catch (error) {
      console.error("Error adding shared user:", error);
    }
  };

  function SignoutButton() {
    async function onSignout() {
      try {
        await axios.get(`${backendUrl}/signout`, { withCredentials: true });
        navigate("/"); //put in backend?
      } catch (error) {
        console.log("Error signing out: ", error);
      }
    }

    return (
      <button className="signoutButton" onClick={onSignout}>
        Sign Out
      </button>
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
          ownerDocuments.slice(0, docLimit).map((doc) => (
            <div key={doc._id} className="boxStyle">
              <Link
                to={`/documents/${doc._id}`}
                style={{ textDecoration: "none" }}
              >
                <h3>{doc.title || "Untitled Document"}</h3>
                <p>Owner: {doc.owner}</p>
              </Link>
              <button onClick={() => handleOpenModal(doc)}>
                Add Shared User
              </button>
              <button onClick={() => handleDeleteDocument(doc._id, "owner")}>
                Delete Document
              </button>
            </div>
          ))
        ) : (
          <p>No documents found.</p>
        )}
        <div className="pagination-controls">
          <button
            onClick={() => handlePreviousPage("owner")}
            disabled={ownerDocumentsPage == 1}
          >
            Previous
          </button>
          <span>Page {ownerDocumentsPage}</span>
          <button
            onClick={() => handleNextPage("owner")}
            disabled={!hasMoreOwnerDocuments}
          >
            Next
          </button>
        </div>
      </div>

      <h2>Shared Documents:</h2>
      <div className="box-container">
        {sharedDocuments.length > 0 ? (
          sharedDocuments.slice(0, docLimit).map((doc) => (
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
        <div className="pagination-controls">
          <button
            onClick={() => handlePreviousPage("shared")}
            disabled={sharedDocumentsPage == 1}
          >
            Previous
          </button>
          <span>Page {sharedDocumentsPage}</span>
          <button
            onClick={() => handleNextPage("shared")}
            disabled={!hasMoreSharedDocuments}
          >
            Next
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Shared Users for {currentDoc.title || "Untitled Document"}</h3>
            <input
              type="text"
              placeholder="Enter username to share with"
              value={sharedUser}
              onChange={(e) => setSharedUser(e.target.value)}
            />
            <button onClick={addSharedUser}>Add User</button>
            <button onClick={handleCloseModal}>Close</button>
            <h4>Currently Shared Users:</h4>
            <div className="shared-users-list">
              {currentSharedUsers.length > 0 ? (
                currentSharedUsers.map((user, index) => (
                  <div key={index} className="shared-user-item">
                    <p>{user}</p>
                    <button onClick={() => removeSharedUser(user)}>
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p>No users shared yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
