const express = require("express");
//const mongoCollection = require("./mongo");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Import required modules
const mongoose = require("mongoose");
const Document = require("./Document");
const bcrypt = require("bcrypt");

// Default content for new documents
const initialContent = "";

// Establish a connection to the MongoDB database
mongoose
  .connect("mongodb://localhost:27017/DocSyncData")
  .then(() => {
    console.log("mongodb connected");
  })
  .catch(() => {
    console.log("mongodb connection failed");
  });

// START OF LOGIN //
// User Schema
const newSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});
const UserCollection = mongoose.model("users", newSchema);

module.exports = UserCollection;

app.get("/", cors(), (req, res) => {});

// Login Endpoint
app.post("/", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserCollection.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ status: "notfound" }); // User not found
    }

    // Compare the entered password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      return res.json({ status: "success" }); // Passwords match, login successful
    } else {
      return res.json({ status: "invalid" }); // Passwords do not match
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "An error occurred" });
  }
});

// Signup Endpoint
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const data = {
    username: username,
    password: password,
  };

  try {
    const existingUser = await UserCollection.findOne({ username: username });
    if (existingUser) {
      return res.json({ status: "exists" });
    }

    // Hash the password before saving to make more secure
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserCollection({ username, password: hashedPassword });
    await newUser.save();

    return res.json({ status: "created" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "An error occurred" });
  }
});

app.listen(8000, () => {
  console.log("port connected");
});

//END OF LOGIN //

// SOCKET CONNECTIONS (for document collab)//
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
// END OF SOCKET CONNECTIONS //
