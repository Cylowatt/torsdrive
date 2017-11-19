// --- Express Imports --- //
var express      = require("express");
var path         = require("path");
var favicon      = require("serve-favicon");
var logger       = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser   = require("body-parser");

var session = require("express-session");
var sessionOpts = {
  secret: "c14692174df28520cfb4c23d987bd51f",
  key: "skey.sid",
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 2629746000} // Month
};

// --- Support Imports --- //
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var app = express();
app.use(session(sessionOpts));
app.use(passport.initialize());
app.use(passport.session());

// --- Own Support Imports --- //
var db           = require("./db.js");
var strings      = require("./strings.js");
var crypto       = require("./auth/crypto.js");
var func         = require("./func.js");
var passportInit = require("./auth/passport.js")(passport, LocalStrategy, db.User, func, crypto, strings);
var auth         = require("./auth/auth.js")(passport, db.Role);

// Clear out the pdb folder.
var exec = require("child_process").exec;
exec("rm ./pdb/*");

// Initialise the database connection.
db.init();

var index = require("./routes/index")(auth, db.Role, db.User, db.Segment, db.Transform, db.sequelize);
var users = require("./routes/users")(auth, func, db.User, crypto, strings, db.Role, db.Segment, db.Transform);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json({limit: "10mb"}));
app.use(bodyParser.urlencoded({ extended: false, limit: "10mb" }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use("/", index);
app.use("/users", users);

/**
 * Restrict access to local machine only.
 */
app.use(function (req, res, next) {
  if (req.ip == "127.0.0.1" || req.ip == "localhost") {
    next();
  } else {
    res.status(403).end();
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
