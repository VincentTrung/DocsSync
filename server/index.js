// Import required modules
const mongoose = require("mongoose");
const Document = require("./Document");

// Default content for new documents
const initialContent = "";

// Establish a connection to the MongoDB database
mongoose.connect("mongodb://localhost:27017/DocSyncData", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Set up a websocket server using on port 3000
const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173", // Allow CORS for client connection
    methods: ["GET", "POST"], // HTTP methods allowed for CORS
  },
});

// Listen for client connections to server
io.on("connection", (socket) => {
  console.log(`Socket ${socket.id} connected`);

  // Listen for the "get-document" event from client
  socket.on("get-document", async (docId) => {
    // Retrieve or create a document with document ID
    const document = await getOrInitializeDocument(docId);

    // Join the socket specific to the document ID
    socket.join(docId);

    // Send the document data to the client to load in their editor
    socket.emit("load-document", document.data);

    // Broadcasting to clients connected to room
    socket.on("send-changes", (data) => {
      socket.broadcast.to(docId).emit("receive-changes", data);
    });

    // Saving the document using mongoDB
    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(docId, { data });
    });
  });

  // Check if client disconnets
  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

// Helper function to retrieve an existing document by ID or create a new one
async function getOrInitializeDocument(id) {
  if (!id) return;

  // Try to find the document by ID in the database
  const document = await Document.findById(id);

  // If document is found, return it; otherwise, create a new one
  return document || Document.create({ _id: id, data: initialContent });
}
