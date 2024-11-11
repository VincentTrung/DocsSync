const express = require("express");
const isAuthenticated = require("../Middlewares/isAuthenticated");
const Document = require("../Models/Document");
const User = require("../Models/User");
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

// Add Shared User to a Document
router.post(
  "/documents/:documentId/addSharedUser",
  isAuthenticated,
  async (req, res) => {
    const { documentId } = req.params;
    const { username } = req.body; // The username to be added

    try {
      const currentUser = req.session.username;
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Only the owner of the document can add shared users
      if (document.owner !== currentUser) {
        return res
          .status(403)
          .json({ message: "You must be the owner of this document" });
      }

      // Check if the user exists in the user database in mongodb
      const userExists = await User.findOne({ username });
      if (!userExists) {
        return res.status(404).json({ message: "User does not exist" });
      }

      // Check if the user is already shared or is owner
      if (
        document.sharedUsers.includes(username) ||
        username == document.owner
      ) {
        return res
          .status(400)
          .json({ message: "User is already shared on this document" });
      }

      // Add the user to the sharedUsers array
      document.sharedUsers.push(username);
      await document.save();

      res.status(200).json({ message: "User added successfully", document });
    } catch (error) {
      console.error("Error adding shared user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Remove Shared User from a Document
router.post(
  "/documents/:documentId/removeSharedUser",
  isAuthenticated,
  async (req, res) => {
    const { documentId } = req.params;
    const { username } = req.body; // The username to be removed

    try {
      const currentUser = req.session.username;

      // Check if the document exists
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if the current user is the owner of the document
      if (document.owner !== currentUser) {
        return res
          .status(403)
          .json({ message: "You are not the owner of this document" });
      }

      // Check if the username exists in the sharedUsers list
      if (!document.sharedUsers.includes(username)) {
        return res
          .status(400)
          .json({ message: "User is not in the shared users list" });
      }

      // Remove the shared user from the sharedUsers array
      document.sharedUsers = document.sharedUsers.filter(
        (user) => user !== username
      );
      await document.save();

      res.status(200).json({ message: "User removed successfully", document });
    } catch (error) {
      console.error("Error removing shared user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete a document only if the current user is the owner
router.delete("/documents/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const username = req.session.username;

  try {
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.owner !== username) {
      return res
        .status(403)
        .json({ error: "You are not the owner of this document" });
    }

    // Delete the document
    await Document.deleteOne({ _id: id });

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while deleting the document." });
  }
});

module.exports = router;
