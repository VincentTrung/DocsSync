// Configuration setup for the db
const mongoose = require("mongoose");

function connectToDatabase() {
  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log("MongoDB connected"))
    .catch(() => console.log("MongoDB connection failed"));
}

module.exports = connectToDatabase;
