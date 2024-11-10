// Load environment variables from .env file
require("dotenv").config();
const port = process.env.PORT;
const frontendUrl = process.env.FRONTEND_URL;
console.log(frontendUrl);

// Import modules
const express = require("express");
const cors = require("cors");
const sessionConfig = require("./Config/sessionConfig");
const connectToDatabase = require("./Config/dbConfig");
const setupSocket = require("./Sockets/socketHandlers");

// Import route handlers for API endpoints
const authRoutes = require("./Routes/authRoutes");
const documentRoutes = require("./Routes/documentRoutes");
const sessionRoutes = require("./Routes/sessionRoutes");

// Initialize express, and the server for Socket.io
const app = express();
const http = require("http").createServer(app);

// Setup Socket server with CORS for frontend communication
const io = require("socket.io")(http, {
  cors: {
    origin: frontendUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.json());
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(sessionConfig);

// Connect to Mongodb
connectToDatabase();

// Set up API routes for authentication, documents, and sessions
app.use(authRoutes);
app.use(documentRoutes);
app.use(sessionRoutes);

// Initialize Socket.io event handling for docs collabs
setupSocket(io, sessionConfig);
// Start socket.io
//io.listen(2000);

// Start the HTTP server on the specified port
http.listen(port, "0.0.0.0", () =>
  console.log(`Express server is running on port ${port}`)
);
