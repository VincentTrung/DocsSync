const express = require("express");
const isAuthenticated = require("../Middlewares/isAuthenticated");
const router = express.Router();

// simple homepage with authentication
router.get("/api/home", isAuthenticated, (req, res) => {
  res.json({ message: "Welcome to the homepage!" });
});

// Grab the session username
router.get("/api/session", isAuthenticated, (req, res) => {
  res.json({ username: req.session.username });
});

// Get loginMethod of current session
router.get("/api/loginMethod", isAuthenticated, (req, res) => {
  res.json({ loginMethod: req.session.loginMethod });
});

// Signout
router.get("/api/signout", isAuthenticated, (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).send("Server error signing out");
    else return res.status(200).send("User signed out");
  });
});

module.exports = router;
