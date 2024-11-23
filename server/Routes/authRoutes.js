const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../Models/User");
// const cookie = require("cookie");
const router = express.Router();
const frontendUrl = process.env.FRONTEND_URL;

// Signup Page
router.post("/signup", async (req, res) => {
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
router.post("/", async (req, res) => {
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

router.post("/googleSignin", async(req, res) => {
  const user = req.body.user;
  const email = user.email;
  const username = user.name;
  console.log("user: ", user);
  console.log("email: ", email);
  console.log("username: ", username);
  
  res.header("Access-Control-Allow-Origin", frontendUrl);
  // CORS with credentials
  res.header("Access-Control-Allow-Credentials", true);

  if(!user || !email) {
    return res.status(500).json({status: "invalid", message: "Server error: Missing data for Google Auth"});
  }
  
  const inDatabase = await User.findOne({ username: email });
  console.log(inDatabase);
  try {
    if(!inDatabase) {
      const hashedPassword = await bcrypt.hash('', 10);
      const newUser = new User({ username: email, password: hashedPassword });
      await newUser.save();
      console.log("creating google user: ", email);
    }
    req.session.username = username;
    console.log(req.session.username, "+++", username);
    return res.json({ status: "success", username: username });
  }
  catch (error) {
    console.log("goog error: ", error);
    return res.status(500).json({status: "error", message: "Something went wrong in server during Google Auth"});
  }
});

module.exports = router;
