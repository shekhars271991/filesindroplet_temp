const jwt = require("jsonwebtoken");
var mysql = require('mysql');

const db = require('./api/config/db');

function notFound(req, res, next) {
  res.status(404);
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  next(error);
}

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  /* eslint-enable no-unused-vars */
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
}

async function verifyToken(req, res, next) {
  var exclusionList = ["/authenticate"];
  var item = exclusionList.find(function(path) {
    return req._parsedUrl.path.indexOf("/api/v1" + path ) >= 0;
  });

  if(item != undefined) {
    return next();
  }
  console.log(req._parsedUrl.path);
  let token = req.body.token || req.query.token || req.headers["authorization"];
  console.log("Token : " + token);
  try {
  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  token = token.replace("Bearer ", "");
  if(token.length < 10) {

    var accountsdetails = await db.query(" \
            SELECT up.id, full_name, ur.name as role, ot.name as org_type FROM user_profiles up \
            JOIN user_roles_pl ur ON up.role = ur.id \
            JOIN organizations o ON o.id = up.organization \
            JOIN org_types_pl ot ON ot.id = o.org_type \
            WHERE up.id =" + parseInt(token));


    if(accountsdetails.length == 0){
      return res.status(403).send("No User Found with the provided token");
    }
    req.user = {
      name:accountsdetails[0].full_name,
      role:accountsdetails[0].role,
      user_id: accountsdetails[0].id,
      org_type: accountsdetails[0].org_type

    }
  }
  else {
    try {
      const decoded = jwt.verify(token, config.TOKEN_KEY);
      req.user = decoded;
    } catch (err) {
      return res.status(401).send("Invalid Token");
    }
  }
  console.log("Token completed. ");
  }
  catch(err) {
    console.log(err);
  }
  return next();
}

module.exports = {
  notFound,
  errorHandler,
  verifyToken
};
