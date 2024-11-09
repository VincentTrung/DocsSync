const express = require("express");
const isAuthenticated = require("../Middlewares/isAuthenticated");
const router = express.Router();

// simple homepage(for now) with authentication
router.get("/home", isAuthenticated, (req, res) => {
  res.json({ message: "Welcome to the homepage!" });
});

// Grab the session username
router.get("/session", isAuthenticated, (req, res) => {
  res.json({ username: req.session.username });
});

module.exports = router;
