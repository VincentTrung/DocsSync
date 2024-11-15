import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./TextEditor.css";

// Interval to save document
const INTERVAL_TO_SAVE = 1000;
// Socket connection
const socketUrl = import.meta.env.VITE_SOCKET_URL;

// QUILL //
// Define toolbar options for the Quill editor
const TOOLBAR_OPTION = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }, { size: ["small", false, "large", "huge"] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["link", "image", "blockquote"],
  ["clean"],
];

export default function TextEditor() {
  // Extract document ID from the URL parameters
  const { id: documentId } = useParams();
  // State to manage socket and Quill instances
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const [documentTitle, setDocumentTitle] = useState("");
  // To handle redirection
  const navigate = useNavigate();

  // Initialize socket connection
  useEffect(() => {
    // connecting to the backend of socket.io server
    const s = io(`${socketUrl}`, {
      withCredentials: true, // Ensures session cookies are sent
    });
    setSocket(s);

    // Clean up/Disconnecting
    return () => {
      s.disconnect();
    };
  }, []);

  // Save document at regular intervals
  useEffect(() => {
    if ((socket == null) | (quill == null)) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, INTERVAL_TO_SAVE);
    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  // Emit changes to server when clients make edit
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (dataChange, oldDataChange, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", dataChange);
    };
    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler);
    };
  }, [socket, quill]);

  // Listen and apply incoming changes from server
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (dataChange) => {
      quill.updateContents(dataChange);
    };
    socket.on("receive-changes", handler);

    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket, quill]);

  // Listen for "load-document" event and load the document content
  useEffect(() => {
    if (socket == null || quill == null) return;

    // Load the document data sent from the server and enable editing
    socket.once("load-document", (document) => {
      quill.setContents(document.data);
      quill.enable();
      setDocumentTitle(document.title); // Set document title
    });

    // Emit the "get-document" event with the document ID to request data from the server
    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  // Emit title change to server
  const handleTitleChange = (event) => {
    const newTitle = event.target.value;
    setDocumentTitle(newTitle);
    socket.emit("update-title", newTitle, documentId); // Emit the updated title to the server
  };

  // Listen for redirect if document not found
  useEffect(() => {
    if (!socket) return;

    // Listen for the 'document-not-found' event to disconnect and redirect
    socket.on("document-not-found", () => {
      // Redirect to home if document is not found
      navigate("/home");
      // disconnect the socket as well
      socket.disconnect();
    });
    return () => {
      socket.off("document-not-found");
    };
  }, [socket, navigate]);

  // Set up Quill editor instance and attach it to the wrapper div
  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";

    // Create a new div for Quill editor
    const editor = document.createElement("div");
    wrapper.append(editor);

    // Initialize Quill editor with specified theme and toolbar options
    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTION },
    });

    //q.disable();
    // Set loading text and save Quill instance to state
    q.setText("Loading...");
    setQuill(q);
  }, []);

  // Listen for title updates from the server
  useEffect(() => {
    if (!socket) return;

    const handler = (newTitle) => {
      setDocumentTitle(newTitle); // Update the document title for all connected clients
    };

    socket.on("document-title-updated", handler);

    return () => {
      socket.off("document-title-updated", handler);
    };
  }, [socket]);

  return (
    <div className="container">
      <div className="document-header">
        <input
          type="text"
          value={documentTitle}
          onChange={handleTitleChange} // Update title on change
          className="docTitle"
        />
      </div>

      <div ref={wrapperRef}></div>
    </div>
  );
}
