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
app.use(
  session({
    secret: "HelpMe",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb://localhost:27017/DocSyncData",
      collectionName: "sessions",
    }),
    cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

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
