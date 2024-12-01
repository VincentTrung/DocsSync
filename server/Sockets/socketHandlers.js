const Document = require("../Models/Document");

// Get or initialize a document if it doesn't exist
async function getDocument(id, username) {
  if (!id) return;
  const document = await Document.findById(id);

  // If no document is found
  if (!document) {
    return { id: "" };
  }
  return document;
}

// Set up a websocket server using Socket.IO
function setupSocket(io, sessionMiddleware) {
  // Use namespaces to work with loadbalancer (Thanks Thierry for suggestion)
  const namespace = io.of("/socket");

  namespace.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
  });

  // Listen for connections in the "/socket" namespace
  namespace.on("connection", (socket) => {
    console.log(`Socket ${socket.id} connected in '/socket' namespace`);

    // intialize a set of ACTIVE USERS
    const connectedUsers = new Set();

    // Return username on request
    socket.on("request-user-info", () => {
      const username = socket.request.session.username;
      if (username) {
        socket.emit("user-info", { id: username });
      }
    });

    // Listen for the "get-document" (grabs doc id and handles doc functions)
    socket.on("get-document", async (docId) => {
      const session = socket.request.session;
      const username = session.username;

      // Emit when a user joins the VIDEO CALL //
      socket.on("join-video-call", ({ docId, peerId }) => {
        console.log(`${username} ${peerId} joined the video call for ${docId}`);
        socket.join(docId); // Join room based on document ID
        namespace.to(docId).emit("new-peer", peerId, docId, username); // send the username of socket
      });

      // Event when a peer disconnects VIDEO (client emitted 'peer-disconnected')
      socket.on("peer-disconnected", (peerId) => {
        console.log(`Peer ${peerId} has disconnected`);
        // Broadcasting to all other peers
        namespace.to(docId).emit("peer-disconnected", peerId);
      });

      // For Tracking ACTIVE USERS on doc
      socket.on("disconnect", () => {
        console.log(`Socket ${socket.id} disconnected`);
        connectedUsers.delete(socket.id);
      });

      // set cursor positions for the document
      if (!namespace.cursorPositions) {
        namespace.cursorPositions = {};
      }
      if (!namespace.cursorPositions[docId]) {
        namespace.cursorPositions[docId] = {};
      }

      // Retrieve document/data
      const document = await getDocument(docId, username);

      if (!document || document.id === "") {
        console.log(`Document with ID ${docId} DNE. Disconnecting socket.`);
        socket.emit("document-not-found"); // Send this event to frontend
        socket.disconnect(); // Disconnect the socket
        return;
      }

      // Redirect to homepage if not authorized
      if (
        document.owner !== username &&
        !document.sharedUsers.includes(username)
      ) {
        socket.emit("redirect", "/home");
        return;
      }

      // Join socket to the document and load
      socket.join(docId);
      socket.emit("load-document", document);

      // Broadcast cursor updates
      socket.on("update-cursor", (docId, cursorIndex) => {
        namespace.cursorPositions[docId][socket.id] = {
          userId: username,
          cursorIndex,
        };

        // Broadcast updated cursor positions to all users in the document
        const cursorData = Object.values(namespace.cursorPositions[docId]);
        namespace.to(docId).emit("receive-cursors", cursorData);
      });

      // Keep changes updated
      socket.on("send-changes", (data) =>
        socket.broadcast.to(docId).emit("receive-changes", data)
      );

      // Save the document data to the DB
      socket.on(
        "save-document",
        async (data) => await Document.findByIdAndUpdate(docId, { data })
      );

      // Handle title change and update it in the DB
      socket.on("update-title", async (newTitle, docId) => {
        try {
          const document = await Document.findByIdAndUpdate(
            docId,
            { title: newTitle },
            { new: true } // Return the updated document
          );

          // Emit the new title to all clients connected to the document
          namespace.to(docId).emit("document-title-updated", document.title);
        } catch (err) {
          console.error("Error updating title:", err);
        }
      });

      // Remove cursor on disconnect
      socket.on("disconnect", () => {
        console.log("A client disconnected");
        if (namespace.cursorPositions[docId]) {
          delete namespace.cursorPositions[docId][socket.id];
          const cursorData = Object.values(namespace.cursorPositions[docId]);
          namespace.to(docId).emit("receive-cursors", cursorData); // Update remaining clients
        }
        connectedUsers.delete(socket.id);
      });
    });
  });
}

module.exports = setupSocket;
