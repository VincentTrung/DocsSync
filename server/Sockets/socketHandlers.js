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

    // Listen for the "get-document" event from client
    socket.on("get-document", async (docId) => {
      const session = socket.request.session;
      const username = session.username;
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
    });

    socket.on("disconnect", () => console.log("A client disconnected"));
  });
}

module.exports = setupSocket;
