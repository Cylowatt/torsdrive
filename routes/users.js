"use strict";

var express = require("express");
var router = express.Router();

module.exports = function (auth, func, User, crypto, strings, Role, Segment, Transform) {

  // http://blog.robertonodi.me/node-authentication-series-email-and-password/

  /**
   * Creates a standard JSON meta object with provided code.
   *
   * @param {Integer} code Code of the error.
   * @return {Object} JSON with the code: {
   *   _meta: {
   *     code: GIVEN_CODE
   *   }
   * }
   */
  function withCode(code) {
    return {
      "_meta": {
        "code": code
      }
    };
  }

  /**
   * Same as withCode.
   */
  function jsonWithCode(code) {
    return withCode(code);
  }


  /**
   * POST /api/login
   * TODO forgot password
   */
  router.post("/api/login", auth.loginUser, function (req, res) {
    res.status(200).json(withCode(10));
  });

  router.get("/api/logout", function (req, res) {

    // If the user is logged in, log them out.
    if (req.user) {
      req.logout();
    }

    res.status(200).json(withCode(10));
  });

 // Clear the sign ups every minute.
  var signUps = {};
  setInterval(function () {
    signUps = {};
  }, 60000);

  /**
   * API to sign a user up.
   *
   * @param {String} email Email/username to use.
   * @param {String} password Password to set.
   * @param {String} lang Preferred language (optional).
   * @return HTTP status 200 on success.
   */
  router.post("/api/signUp", function (req, res) {

    // Block out abusive IPs.
    var ip = req.connection.remoteAddress;
    if (signUps[ip]) {
      if (signUps[ip] >= 5) {
        return res.status(404).json(withCode(0));
      } else {
        signUps[ip]++;
      }
    } else {
      signUps[ip] = 1;
    }

    var email = req.body.email;
    var password = req.body.password;

    // http://stackoverflow.com/a/46181
    if (!func.isString(email) || !(/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i).test(email)) {
      return res.status(400).json(withCode(310));
    } else if (!func.isString(password) || password.length < 7 || !/\d/.test(password)) {
      return res.status(400).json(withCode(311));
    }

    var preferredLanguage = "en";
    if (!func.isEmptyString(req.body.lang) && req.body.lang.length <= 3) {
      preferredLanguage = req.body.lang;
    }

    // Make sure that the user has a unique email.
    User.findOne({where: {email: email}}).then(function (user) {
      if (user) {
        func.log(`Duplicate account exists for ${email}`);
        return res.status(400).json(withCode(312));
      }

      // Fine the ID of the role of a user (note the use of promises).
      return Role.findOne({where: {name: strings.dbRoleUser}});
    }).then(function (role) {
      if (func.isUndefined(role)) {
        return res.status(500).json(withCode(0));
      }

      // Hash and salt the user's password.
      crypto.hashPassword(password, function (err, hashed, salt) {
        if (err) {
          func.log(`Failed to hash password for email ${email}`);
          return res.status(500).json(withCode(0));
        }

        // Concatenate the password and the salt via separator.
        var passwordToStore = hashed + strings.passwordSeparator + salt;

        // Create the user.
        User.create({
          username:          email,
          password:          passwordToStore,
          email:             email,
          preferredLanguage: preferredLanguage,
          role_id:           role.id
        }).then(function () {
          // On success, simply send status 200.
          res.status(200).end(); // 10
        }).catch(function (createError) {
          func.log(`Failed to create user: ${JSON.stringify(createError)}`);
          return res.status(500).json(withCode(0));
        });
      });

    }).catch(function (error) {
      func.log(JSON.stringify(error));
      return res.status(500).json(withCode(0));
    });
  });


  /**
   * GET /api/getUserSegments
   *
   * Allows to get all of the user's segments.
   *
   * @return JSON {
   *   ID_OF_PDB_HERE: {
   *      "name": FULL_NAME,
   *      "pdbCode": "1adg",
   *      "id": ID_OF_PDB_HERE
   *      "chain": "A",
   *      "start": 290,
   *      "end": 301
   *   },
   *   ANOTHER_ID: {
   *      ...
   *   }
   * }
   */
  router.get("/api/getUserSegments", auth.loginUser, function (req, res) {
    var userId = req.user.id;

    Segment.findAll({where: {owner: userId}}).then(function (segments) {

      var pdbName;
      var commonName;
      var json = {};
      var i = 0;
      for (i; i < segments.length; i++) {

        pdbName = segments[i].pdb_name;
        commonName = segments[i].name;
        if (func.isUndefined(commonName)) {
          commonName = segments[i].pdb_name;
        } else if (func.isUndefined(pdbName)) {
          pdbName = segments[i].name;
        }

        json[segments[i].id] = {
          "name":    commonName,
          "pdbCode": pdbName,
          "id":      segments[i].id,
          "chain":   segments[i].chain,
          "start":   segments[i].start,
          "end":     segments[i].end
        };
      }

      // Construct and send success JSON.
      json["_meta"] = jsonWithCode(10)["_meta"];
      return res.status(200).json(json);
    }).catch(function (error) {
      func.log(`Failed to load segments of ${userId}: ${JSON.stringify(error)}`);
      // Generic server error.
      return res.status(500).json(withCode(0));
    });
  });

  /**
   * POST /api/deleteSegment
   * Deletes a segment of a user given the ID.
   *
   * @param {String} segmentId ID of the segment to delete.
   */
  router.post("/api/deleteSegment", auth.loginUser, function (req, res) {
    var userId = req.user.id;
    var segmentId = req.body.segmentId;

    if (!func.isString(segmentId)) {
      // No segment ID provided.
      return res.status(400).json(withCode(203));
    }

    Segment.destroy({where: {id: segmentId, owner: userId}}).then(function () {
      return res.status(200).json(withCode(10)); // Success.
    }).catch(function (err) {
      func.log(JSON.stringify(err));
      // Generic server error.
      return res.status(500).json(withCode(0));
    });
  });

  /**
   * @param {String} transformId ID of the transform to delete.
   */
  router.post("/api/deleteTransform", auth.loginUser, function (req, res) {
    var userId = req.user.id;
    var transformId = req.body.transformId;

    if (!func.isString(transformId)) {
      // No transform ID provided.
      return res.status(400).json(withCode(204));
    }

    Transform.destroy({where: {id: transformId, owner: userId}}).then(function () {
      return res.status(200).json(withCode(10)); // Success.
    }).catch(function (err) {
      func.log(JSON.stringify(err));
      // Generic server error.
      return res.status(500).json(withCode(0));
    });
  });



  /**
   * GET /api/getUserTransforms&segment=SEGMENT_ID
   *
   * Allows to get all of the user's transforms for a given segment.
   *
   * @return JSON {
   *   ID_OF_TRANSFORM_HERE: {
   *      "name": "Transform 1",
   *      "uid": "ID_OF_TRANSFORM_HERE",
   *      "showOnMain": true/false,
   *      "tors": [{
   *           "num": torsion_num,
   *           "type": "psi",
   *           "value": 119.435},
   *        ... ]
   *   },
   *   ANOTHER_ID: {
   *      ...
   *   }
   * }
   */
  router.get("/api/getUserTransforms", auth.loginUser, function (req, res) {
    var userId = req.user.id;
    var segmentId = req.query.segment;

    Transform.findAll({where: {
        owner: userId,
        segment_id: segmentId
      }}).then(function (transforms) {

        var json = {};
        var i = 0;
        for (i; i < transforms.length; i++) {
          json[transforms[i].id] = {
            name: func.isUndefined(transforms[i].name) ? i : transforms[i].name,
            id: transforms[i].id,
            showOnMain: transforms[i].show_on_main,
            transformMeta: JSON.parse(transforms[i].meta).transformMeta
          };
        }

        // Construct and send success JSON.
        json["_meta"] = jsonWithCode(10)["_meta"];
        res.status(200).json(json); // 10

      }).catch(function (error) {
        func.log("Error on getUserTransforms: " + JSON.stringify(error));
        return res.status(500).json(withCode(0));
      });
  });

  /**
   * Allows to set the preferred language for a user.
   *
   * @param {String} lang Language to set (usually an ISO 8601 code; no more than 3 letters long).
   */
  router.post("/api/setPreferredLanguage", auth.loginUser, function (req, res) {
    var userId = req.user.id;
    var lang = req.body.lang;

    if (func.isEmptyString(lang)) {
      return res.status(400).json(withCode(0)); // TODO custom error
    } else if (lang.length > 3) {
      return res.status(400).json(withCode(0));
    }

    User.findOne({where:
      { id: userId }
    }).then(function (user) {
      user.update({preferredLanguage: lang}).then(function () {
        return res.status(200).json(withCode(10));
      });
    }).catch(function (error) {
      func.log(error);
      return res.status(500).json(withCode(0));
    });
  });

  /**
   * Allows to access the user's preferred language.
   *
   * @return {JSON} {
   *    lang: "language code"
   * }
   */
  router.get("/api/getPreferredLanguage", auth.loginUser, function (req, res) {
    var userId = req.user.id;
    User.findOne({where: {
      id: userId
    }}).then(function (user) {
      var result = jsonWithCode(10);
      result.lang = user.preferredLanguage;
      return res.status(200).json(result);
    }).catch(function (error) {
      func.log(error);
      return res.status(500).json(withCode(0));
    });
  });

  /**
   * Irreversible operation to share a transform on the main page.
   * The posting user has to be the owner of the transform.
   *
   * @param {JSON} {
   *   "transformId": TRANSFORM_TO_SHARE
   * }
   */
  router.post("/api/shareTransformOnMain", auth.loginUser, function (req, res) {
    var transformId = req.body.transformId;

    if (func.isEmptyString(transformId)) {
      return res.status(400).json(withCode(204));
    }

    Transform.findOne({where: {id: transformId}}).then(function (transform) {
      if (func.isUndefined(transform)) {
        return res.status(404).json(withCode(206));
      }

      transform.update({show_on_main: true});
      return res.status(200).json(withCode(10));
    }).catch(function (error) {
      func.log(error);
      return res.status(500).json(withCode(0));
    });

  });

  // --- ADMIN --- //

  /**
   *
   */
  router.get("/api/adminGetUserListing", auth.loginUser, function (req, res) {
    var user = req.user;

    auth.isAdmin(user, res, function (roles) {
      User.findAll().then(function (users) {
          var i = 0;
          var len = users.length;
          var results = {};
          for (i; i < len; i++) {
            results[i] = {
              "id":                users[i].id,
              "username":          users[i].username,
              "email":             users[i].email,
              "preferredLanguage": users[i].preferredLanguage,
              "role":              roles[users[i].role_id]
            };
          }

          var result = jsonWithCode(10);
          result.roles = roles;
          result.users = results;
          return res.status(200).json(result);
      }).catch(function (error) {
        func.log(error);
        return res.status(500).json(withCode(0));
      });
    });
  });


  function setUserValue(userId, newData, callback) {
    User.findOne({where :
      { id: userId }
    }).then(function (user) {
      return user.update(newData);
    }).then(function () {
      callback();
    }).catch(function (error) {
      func.log(error);
      callback(error);
    });
  }

  /**
   * Note that there are no checks on the data.
   *
   * @param {JSON} {
   *   password: {String},
   *   userId: {Number/String}
   * }
   */
  router.post("/api/adminSetPassword", auth.loginUser, function (req, res) {
    var user = req.user;

    auth.isAdmin(user, res, function (roles) {
      crypto.hashPassword(req.body.password, function (err, hash, salt) {
        if (err) {
          func.log(err);
          return res.status(500).json(withCode(0));
        }

        var userId = req.body.userId;
        var password = hash + strings.passwordSeparator + salt;
        setUserValue(userId, {"password": password}, function (error) {
          if (error) {
            func.log(error);
            return res.status(500).json(withCode(0));
          }

          return res.status(200).json(withCode(10));
        });
      });
    });
  });

  /**
   * Note that there are no checks on the data.
   *
   * @param {JSON} {
   *   username: {String},
   *   userId: {Number/String}
   * }
   */
  router.post("/api/adminSetUsername", auth.loginUser, function (req, res) {
    var user = req.user;

    auth.isAdmin(user, res, function (roles) {
      var userId = req.body.userId;
      var username = req.body.username;

      setUserValue(userId, {"username": username}, function (error) {
        if (error) {
          func.log(error);
          return res.status(500).json(withCode(0));
        }

        return res.status(200).json(withCode(10));
      });
    });
  });

  /**
   * Note that there are no checks on the data.
   * @param {JSON} {
   *   email: {String},
   *   userId: {Number/String}
   * }
   */
  router.post("/api/adminSetEmail", auth.loginUser, function (req, res) {
    var user = req.user;

    auth.isAdmin(user, res, function (roles) {
      var userId = req.body.userId;
      var email = req.body.email;

      setUserValue(userId, {"email": email}, function (error) {
        if (error) {
          func.log(error);
          return res.status(500).json(withCode(0));
        }

        return res.status(200).json(withCode(10));
      });
    });
  });

  /**
   * Note that there are no checks on the data.
   * @param {JSON} {
   *   preferredLanguage: {String},
   *   userId: {Number/String}
   * }
   */
  router.post("/api/adminSetLanguage", auth.loginUser, function (req, res) {
    var user = req.user;

    auth.isAdmin(user, res, function (roles) {
      var userId = req.body.userId;
      var lang = req.body.preferredLanguage;

      setUserValue(userId, {"preferredLanguage": lang}, function (error) {
        if (error) {
          func.log(error);
          return res.status(500).json(withCode(0));
        }

        return res.status(200).json(withCode(10));
      });
    });
  });

  /**
   * POST /api/adminLogin
   */
  router.post("/api/adminLogin", auth.loginUser, function (req, res) {
    auth.isAdmin(req.user, res, function (roles) {
      res.status(200).json(withCode(10));
    });
  });

  return router;
}
