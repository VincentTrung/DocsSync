const express = require("express");
//const mongoCollection = require("./mongo");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true,
  })
);

// Import required modules
const mongoose = require("mongoose");
const Document = require("./Document");
// Default content for new documents
const initialContent = "";

const bcrypt = require("bcrypt");

// Sessions
const session = require("express-session");
const MongoStore = require("connect-mongo");
// Check if authenticated
function isAuthenticated(req, res, next) {
  if (!req.session.username)
    return res.status(401).json({ error: "Access denied" });
  next();
}

// Configure session middleware
const sessionMiddleware = session({
  secret: "HelpMe",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: "mongodb://localhost:27017/DocSyncData",
    collectionName: "sessions",
  }),
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 },
});

// Use session middleware in Express app
app.use(sessionMiddleware);

// Check if authenticated
function isAuthenticated(req, res, next) {
  if (!req.session.username)
    return res.status(401).json({ error: "Access denied" });
  next();
}

// Endpoint to check auth
app.get("/home", isAuthenticated, (req, res) => {
  res.json({ message: "Welcome to the homepage!" });
});

// Endpoint to get the logged-in user's username
app.get("/session", isAuthenticated, (req, res) => {
  //console.log(req.session.username);
  res.json({ username: req.session.username });
});

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
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});
const UserCollection = mongoose.model("users", userSchema);

// Login Endpoint
app.post("/", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserCollection.findOne({ username });
    if (!user) return res.status(404).json({ status: "notfound" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.username = user.username; // Save username in session
      //console.log("Session data:", req.session);
      return res.json({
        status: "success",
        username: user.username,
      });
    } else {
      return res.status(401).json({ status: "invalid" });
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

  try {
    const existingUser = await UserCollection.findOne({ username });
    if (existingUser) {
      return res.json({ status: "exists" });
    }

    // Hash the password before saving to make it more secure
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

// Listen on port 8000 for Express
app.listen(8000, () => {
  console.log("Express server is running on port 8000");
});
// END OF LOGIN //

// SOCKET CONNECTIONS (for document collaboration) //
// Set up a websocket server using Socket.IO on port 3000
const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173", // Allow CORS for client connection
    methods: ["GET", "POST"], // HTTP methods allowed for CORS
    credentials: true, // Allow credentials to be sent
  },
});

// Use session middleware for Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Listen for client connections to the server
io.on("connection", (socket) => {
  console.log(`Socket ${socket.id} connected`);

  // Listen for the "get-document" event from client
  socket.on("get-document", async (docId) => {
    const session = socket.request.session; // Access the session
    const username = session.username; // Get the current user's username
    //console.log(session);

    // Retrieve or create a document with document ID
    const document = await getOrInitializeDocument(docId, username);

    // Check if the user is authorized to access the document
    if (
      document.owner !== username &&
      !document.sharedUsers.includes(username)
    ) {
      // Emit an event to redirect the client to the home page
      socket.emit("redirect", "/home");
      return;
    }

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

  // Check if client disconne
  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

// Helper function to retrieve an existing document by ID or create a new one
async function getOrInitializeDocument(id, username) {
  if (!id) return;

  // Try to find the document by ID in the database
  const document = await Document.findById(id);

  // If the document is found, return it; otherwise, create a new one with the owner
  if (document) {
    return document;
  } else {
    const newDocument = await Document.create({
      _id: id,
      data: "", // Default content for new documents
      owner: username, // Set the owner to the current user's username
      title: "Untitled Document",
    });
    return newDocument;
  }
}
// END OF SOCKET CONNECTIONS //

// Endpoint to get documents accessible to the logged-in user
app.get("/documents", isAuthenticated, async (req, res) => {
  const username = req.session.username; // Get the logged-in user's username

  try {
    // Find documents where the user is either the owner or in the sharedUsers array
    const documents = await Document.find({
      $or: [
        { owner: username }, // User is the owner
        { sharedUsers: username }, // User is a shared user
      ],
    });

    // Format the response to include the document ID and ownership status
    const formattedDocuments = documents.map((doc) => ({
      _id: doc._id,
      data: doc.data,
      title: doc.title,
      owner: doc.owner,
      sharedUsers: doc.sharedUsers,
      isOwner: doc.owner === username, // Boolean indicating if the user is the owner
      isSharedUser: doc.sharedUsers.includes(username), // Boolean indicating if the user is a shared user
    }));

    res.json(formattedDocuments); // Send the documents as a JSON response
  } catch (error) {
    console.error("Error fetching documents:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching documents." });
  }
});
