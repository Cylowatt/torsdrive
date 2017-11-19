"use strict";

module.exports = function (passport, Role) {

  // Clear out abusive IPs every minute.
  /*var logins = {};
  setInterval(function () {
    logins = {};
  }, 60000); */


  var loginUser = function (req, res, next) {

    // User already logged in.
    if (req.user) {
      return next();
    }

    // Lock out abusive IPs
/*    var ip = req.connection.remoteAddress;
    if (logins[ip] >= 10) {
      return res.status(404).json({
        "_meta": {
          "code": 0
        }
      });
    }*/

    // Authenticate using the local strategy.
    passport.authenticate("local", function (err, user, info) {
      if (err || !user) {

        /*if (logins[ip]) {
          logins[ip]++;
        } else {
          logins[ip] = 1;
        }*/

        return res.status(400).json({
          "_meta": {
            "code": 300
          }
        });
      }

      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }

        next();
      });
    })(req, res, next);
  };

  var isAdmin = function (user, res, callback) {
    Role.findAll().then(function (roles) {

      var i = 0;
      var len = roles.length;
      var ids = {};
      for (i; i < len; i++) {
        ids[roles[i].id.toString()] = roles[i].name;
      }

      var admin = (ids[user.role_id.toString()].toLowerCase() === "admin");
      if (!admin) {
        return res.status(403).json({
          "_meta": {
            "code": 350
          }
        });
      } else {
        callback(ids);
      }
    }).catch(function (error) {
      console.log(error);
      return res.status(500).json({
        "_meta": {
          "code": 0
        }
      });
    });
  };

  return {
    loginUser: loginUser,
    isAdmin: isAdmin
   };
};
