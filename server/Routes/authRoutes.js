const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../Models/User");
const router = express.Router();

// Signup Page
router.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    // see if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.json({ status: "exists" });

    // Create the user and save to db
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.json({ status: "created" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "An error occurred" });
  }
});

// Login Page
router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // See if user exists
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ status: "notfound" });

    // Validate password if so
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.username = user.username;
      res.json({ status: "success", username: user.username });
    } else {
      res.status(401).json({ status: "invalid" });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: "An error occurred" });
  }
});

module.exports = router;
