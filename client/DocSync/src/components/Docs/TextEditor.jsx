import { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Quill from "quill";
import Peer from "peerjs";
import "quill/dist/quill.snow.css";
import "./TextEditor.css";

// Interval to save document
const INTERVAL_TO_SAVE = 1000;
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

// hash function for assigning users colours
function generateColor(username) {
  const palette = [
    "#FF0000", // Red
    "#008000", // Green
    "#0000ff", // Blue
    "#Ffc0cb", // Pink
    "#FFD133", // Yellow
    "#33FFF0", // Cyan
  ];
  const hash = username
    .split("") // Convert/remove quotes
    //acc=0 starting value, hash username
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length]; //ex 399%6=3 etc
}

export default function TextEditor() {
  const navigate = useNavigate(); // To handle redirection
  // Extract document ID from the URL parameters
  const { id: documentId } = useParams();
  // State to manage socket and Quill instances
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const [documentTitle, setDocumentTitle] = useState("");

  // Track the clients cursor data
  const [userId, setUserId] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(null);

  // Track other clients on the doc
  const [userCursors, setUserCursors] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);

  // VIDEO CALLING STUFF MAYBE MOVE TO NEW FILE //
  // Video Calling
  const [peer, setPeer] = useState(null); // PeerJS peer instance
  const [myStream, setMyStream] = useState(null); // Local stream
  const [otherPeers, setOtherPeers] = useState([]); // List of other peer IDs for video call
  const [videoCallEnabled, setVideoCallEnabled] = useState(false); // Toggle for video calling

  const userVideoRef = useRef();

  // If user intiated call, then create call
  useEffect(() => {
    if (videoCallEnabled) {
      const peer = new Peer(); // Create a PeerJS instance
      setPeer(peer);

      peer.on("open", (id) => {
        socket.emit("join-video-call", {
          docId: documentId,
          peerId: id,
        });
      });

      // Get my media stream (video and audio)
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setMyStream(stream);
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.log("Failed to get media:", err));

      return () => {
        // Cleanup
        peer.destroy(); // Clean up PeerJS instance
        setPeer(null);
        if (myStream) {
          myStream.getTracks().forEach((track) => track.stop()); // Stop media stream
          setMyStream(null);
        }
        setOtherPeers([]); // Clear other peers
      };
    } else {
      // Disable video call: clean up media stream and PeerJS
      if (peer) peer.destroy();
      setPeer(null);
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
        setMyStream(null);
      }
      setOtherPeers([]); // Clear other peers
    }
  }, [videoCallEnabled]);

  // Listen for new peers joining the call
  useEffect(() => {
    if (socket == null || peer == null) return;

    // Listen for new peers connecting to the call
    const handleNewPeer = (newPeerId, docId, usernameId) => {
      if (docId == documentId && myStream) {
        // Initiate a call to the new peer with the correct username metadata
        const call = peer.call(newPeerId, myStream, {
          metadata: { username: userId }, // Ensure correct username
        });

        // add the peers to list of peer streams
        call.on("stream", (stream) => {
          setOtherPeers((prev) => {
            if (!prev.some((peerData) => peerData.stream.id == stream.id)) {
              return [
                ...prev,
                {
                  stream,
                  peerId: newPeerId,
                  username: usernameId, // grab username of peer
                },
              ];
            }
            return prev;
          });
        });

        call.on("close", () => {
          // Only keep active and not myStream
          setOtherPeers((prev) =>
            prev
              .filter((peerData) => peerData.peerId != newPeerId)
              .filter((peerData) => peerData.stream.active)
          );
        });
      }
    };
    // listener is always active for each peer
    socket.on("new-peer", handleNewPeer);
    return () => {
      socket.off("new-peer", handleNewPeer);
    };
  }, [socket, peer, myStream, documentId]);

  // If the peer connection is active, keep open to listen for new peers
  useEffect(() => {
    if (peer == null) return;

    peer.on("call", (call) => {
      //console.log("Incoming call from:", call.peer);
      call.answer(myStream); // Answer the call with your local stream

      call.on("stream", (stream) => {
        setOtherPeers((prev) => {
          // Add the incoming stream with its associated username and peer ID
          if (!prev.some((peerData) => peerData.stream.id == stream.id)) {
            return [
              ...prev,
              { stream, peerId: call.peer, username: call.metadata?.username },
            ];
          }
          return prev;
        });

        // Remove inactive streams
        setOtherPeers((prevPeers) =>
          prevPeers.filter((peerData) => peerData.stream.active)
        );
      });

      call.on("close", () => {
        //console.log("Call with peer closed:", call.peer);
        socket.emit("peer-disconnected", call.peer);
      });
    });

    return () => {
      peer.off("call");
    };
  }, [peer, myStream]);

  // Detect when a peer disconnects or goes inactive by leaving
  useEffect(() => {
    if (socket == null || peer == null) return;

    // Handle peer disconnection
    const handlePeerDisconnect = (peerId) => {
      console.log("Peer disconnected:", peerId);

      setOtherPeers((prev) =>
        prev.map((peerStream) =>
          peerStream.id == peerId
            ? { ...peerStream, active: false }
            : peerStream
        )
      );
    };

    socket.on("peer-disconnected", handlePeerDisconnect);
    return () => {
      socket.off("peer-disconnected", handlePeerDisconnect);
    };
  }, [socket, peer]);

  // END OF VIDEO CALLING STUFF TO MOVE //

  // Initialize socket connection
  useEffect(() => {
    // connecting to the backend of socket.io server
    const s = io(`${socketUrl}`, {
      withCredentials: true, // Ensures session cookies are sent
    });
    setSocket(s);

    // Get the userId from the server
    s.emit("request-user-info");
    // Listen for the user-info event. Need username later
    s.on("user-info", ({ id }) => {
      setUserId(id);
    });

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
      if (source != "user") return;
      socket.emit("send-changes", dataChange);

      // Track other clients cursors
      const range = quill.getSelection();
      if (range) {
        setCursorPosition(range.index);
        socket.emit("update-cursor", documentId, range.index);
      }
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

      // Emit/load everyones name/positions on page load
      socket.emit("update-cursor", documentId, 0);
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

  // Track clients cursor position
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (range) => {
      if (range) {
        setCursorPosition(range.index);
        if (socket) socket.emit("update-cursor", documentId, range.index);
      }
    };
    quill.on("selection-change", handler);
    // Emit an initial cursor position
    socket?.emit("update-cursor", documentId, 0);

    return () => {
      quill.off("selection-change", handler);
    };
  }, [quill, socket, documentId]);

  // Handle incoming cursor data from server (from other clients)
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (cursors) => {
      // Exclude the client's cursor by filtering out its userId
      const filteredCursors = cursors.filter(
        (cursor) => cursor.userId != userId
      );

      const uniqueCursors = Array.from(
        new Map(
          cursors
            .filter((cursor) => cursor.userId !== userId) // exclude current client
            .map((cursor) => [cursor.userId, cursor]) // remove duplicates
        ).values()
      );
      // Set to be used for displaying cursors/names
      setUserCursors(filteredCursors);
      setActiveUsers(uniqueCursors);
    };

    socket.on("receive-cursors", handler);
    return () => {
      socket.off("receive-cursors", handler);
    };
  }, [socket, quill, userId]);

  // TO render cursors
  useEffect(() => {
    if (!quill) return;

    // Create container and attach to quill
    const cursorsLayer = document.createElement("div");
    cursorsLayer.className = "cursors-layer";
    quill.container.appendChild(cursorsLayer);

    // Function to update and render user cursors
    const updateCursors = () => {
      cursorsLayer.innerHTML = ""; // Clear existing cursors

      userCursors.forEach(({ userId, cursorIndex }) => {
        // Fix the scaling issues with different fonts
        const bounds = quill.getBounds(cursorIndex); // Get position bounds in Quill

        // Get the header types at the cursor position
        const formats = quill.getFormat(cursorIndex);
        const headerLevel = formats.header || null;

        // Adjust cursor height based on header level
        let cursorHeight;
        if (headerLevel) {
          cursorHeight = 20 + (6 - headerLevel) * 5; // Adjust values from 1-6
        } else {
          cursorHeight = 16; // Default height for non-header text
        }

        // Cursor properties
        const cursorEl = document.createElement("div");
        cursorEl.className = "cursor-indicator";
        cursorEl.style.position = "absolute";
        cursorEl.style.backgroundColor = generateColor(userId);
        cursorEl.style.width = "1.5px"; // Cursor width remains the same
        cursorEl.style.height = `${cursorHeight}px`;
        cursorEl.style.left = `${bounds.left - 2}px`;
        cursorEl.style.top = `${bounds.top}px`;

        cursorsLayer.appendChild(cursorEl); // Append the cursor to the layer
      });
    };
    updateCursors(); // Initial render

    return () => {
      cursorsLayer.remove();
    };
  }, [quill, userCursors]);

  // console.log(myStream?.id);
  // console.log(otherPeers);

  return (
    <div className="container documentEditor">
      <div className="videoCallContainer">
        <div className="videoCallToggle">
          <button onClick={() => setVideoCallEnabled((prev) => !prev)}>
            {videoCallEnabled ? "Disable Video Call" : "Enable Video Call"}
          </button>
        </div>
        <div className="myVideo">
          {videoCallEnabled ? (
            <>
              <video ref={userVideoRef} autoPlay muted />
              <p className="myUsername videoNames">{userId}</p>
            </>
          ) : null}
        </div>
        {otherPeers
          .filter(
            (peerData) =>
              peerData.stream.id !== myStream?.id &&
              peerData.stream.active === true
          )
          .map((peerData, index) => (
            <div key={peerData.peerId || index} className="peerVideo">
              <video
                autoPlay
                ref={(video) => {
                  if (video && video.srcObject !== peerData.stream) {
                    video.srcObject = peerData.stream;
                  }
                }}
              ></video>
              <p className="username videoNames">{peerData.username}</p>
            </div>
          ))}
      </div>
      <div className="documentHeader">
        <input
          type="text"
          value={documentTitle}
          onChange={handleTitleChange} // Update title on change
          className="docTitle"
        />
        <div className="activeUsers">
          <h3>Active Document Editors</h3>
          <ul>
            {activeUsers.map((cursor) => (
              <li
                key={cursor.userId}
                style={{ color: generateColor(cursor.userId) }}
              >
                {cursor.userId}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div ref={wrapperRef}></div>
    </div>
  );
}
