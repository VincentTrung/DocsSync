const { Schema, model } = require("mongoose");

const Document = new Schema({
  _id: String,
  data: Object,
  title: String,
  owner: { type: String, required: true }, // Store the owner's username
  sharedUsers: { type: [String], default: [] }, // Array of usernames with access
});

module.exports = model("DocSyncDocument", Document);
