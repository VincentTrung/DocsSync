// Authentications/check for authentications
function isAuthenticated(req, res, next) {
  if (!req.session.username)
    return res.status(401).json({ error: "Access denied" });
  next();
}

module.exports = isAuthenticated;
