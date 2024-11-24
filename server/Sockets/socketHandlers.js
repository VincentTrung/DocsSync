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
  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
  });

  io.on("connection", (socket) => {
    console.log(`Socket ${socket.id} connected`);

    const connectedUsers = new Set(); // set of users
    // Notify all clients of the updated user list
    const broadcastActiveUsers = () => {
      const users = Array.from(connectedUsers).map(({ id, username }) => ({
        id,
        username,
      }));
      io.emit("active-users", users);
    };

    // Return username
    socket.on("request-user-info", () => {
      const username = socket.request.session.username;
      // console.log("Username from session:", username);
      if (username) {
        socket.emit("user-info", { id: username });
      }
    });

    // Listen for the "get-document" event from client
    socket.on("get-document", async (docId) => {
      const session = socket.request.session;
      const username = session.username;

      // Emit when a user joins the VIDEO CALL //
      socket.on("join-video-call", ({ docId, peerId }) => {
        console.log(
          `${username} ${peerId} joined the video call for document ${docId}`
        );
        socket.join(docId); // Join room based on document ID
        io.to(docId).emit("new-peer", peerId, docId, username); //send the username of socket
      });

      // For Tracking active users
      socket.on("disconnect", () => {
        console.log(`Socket ${socket.id} disconnected`);
        connectedUsers.delete(socket.id);
        broadcastActiveUsers();
      });

      // Event when a peer disconnects (client emitted 'peer-disconnected')
      socket.on("peer-disconnected", (peerId) => {
        console.log(`Peer ${peerId} has disconnected`);

        // Broadcasting to all other peers
        io.to(docId).emit("peer-disconnected", peerId);
      });

      // Store cursor positions for the document
      if (!io.cursorPositions) {
        io.cursorPositions = {};
      }
      if (!io.cursorPositions[docId]) {
        io.cursorPositions[docId] = {};
      }

      const document = await getDocument(docId, username);

      if (!document || document.id === "") {
        console.log(
          `Document with ID ${docId} does not exist. Disconnecting socket.`
        );
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
        io.cursorPositions[docId][socket.id] = {
          userId: username,
          cursorIndex,
        };

        // Broadcast updated cursor positions to all users in the document
        const cursorData = Object.values(io.cursorPositions[docId]);
        io.to(docId).emit("receive-cursors", cursorData);
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
          io.to(docId).emit("document-title-updated", document.title);
        } catch (err) {
          console.error("Error updating title:", err);
        }
      });

      // Remove cursor on disconnect
      socket.on("disconnect", () => {
        console.log("A client disconnected");
        if (io.cursorPositions[docId]) {
          delete io.cursorPositions[docId][socket.id];
          const cursorData = Object.values(io.cursorPositions[docId]);
          io.to(docId).emit("receive-cursors", cursorData); // Update remaining clients
        }
        connectedUsers.delete(socket.id);
        broadcastActiveUsers();
      });
    });
  });
}

module.exports = setupSocket;
