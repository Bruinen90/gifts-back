const jws = require("jsonwebtoken");
const ENV = require("../env/env");

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;
    next();
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jws.verify(token, ENV.jwtSecret);
  } catch (error) {
    req.isAuth = false;
    next();
  }
  if (!decodedToken) {
    req.isAuth = false;
    next()
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
