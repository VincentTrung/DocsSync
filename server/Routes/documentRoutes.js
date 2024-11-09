const express = require("express");
const isAuthenticated = require("../Middlewares/isAuthenticated");
const Document = require("../Models/Document");
const router = express.Router();

// Create a new document with for the current user
router.get("/documents", isAuthenticated, async (req, res) => {
  const username = req.session.username;
  try {
    // Find documents where the user is either owner or sharedUser
    const documents = await Document.find({
      $or: [{ owner: username }, { sharedUsers: username }],
    });

    // Intialize/format doc
    const formattedDocuments = documents.map((doc) => ({
      _id: doc._id,
      data: doc.data,
      title: doc.title,
      owner: doc.owner,
      sharedUsers: doc.sharedUsers,
      isOwner: doc.owner === username,
      isSharedUser: doc.sharedUsers.includes(username),
    }));
    res.json(formattedDocuments);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching documents." });
  }
});

module.exports = router;
