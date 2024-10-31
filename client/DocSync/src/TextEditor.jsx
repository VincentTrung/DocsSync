import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import Quill from "quill";
import "quill/dist/quill.snow.css";

// Define toolbar options for the Quill editor
const TOOLBAR_OPTION = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

export default function TextEditor() {
  // Extract document ID from the URL parameters
  const { id: documentId } = useParams();
  // State to manage socket and Quill instances
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();

  useEffect(() => {}, [socket, quill]);

  // Initialize socket connection
  useEffect(() => {
    // connecting to the backend of socket.io server
    const s = io("http://localhost:3000");
    setSocket(s);

    // Clean up/Disconnecting
    return () => {
      s.disconnect();
    };
  }, []);

  // Listen for "load-document" event and load the document content
  useEffect(() => {
    if (socket == null || quill == null) return;

    // Load the document data sent from the server and enable editing
    socket.once("load-document", (document) => {
      quill.setContents(document);
      quill.enable();
    });

    // Emit the "get-document" event with the document ID to request data from the server
    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

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

  // Render
  return <div className="container" ref={wrapperRef}></div>;
}
