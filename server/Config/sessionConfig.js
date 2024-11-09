// Configuration setup for sessions
const session = require("express-session");
const MongoStore = require("connect-mongo");

const sessionConfig = session({
  secret: "HelpMe",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    collectionName: "sessions",
  }),
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 },
});

module.exports = sessionConfig;
