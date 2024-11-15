const Document = require("../Models/Document");

// Get or intialize a document if it doesnt exist
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
      // Keep saving the data to db
      socket.on(
        "save-document",
        async (data) => await Document.findByIdAndUpdate(docId, { data })
      );
    });

    socket.on("disconnect", () => console.log("A client disconnected"));
  });
}

module.exports = setupSocket;
