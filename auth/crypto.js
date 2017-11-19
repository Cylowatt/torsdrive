"use strict";

var crypto = require("crypto");

// http://blog.robertonodi.me/node-authentication-series-email-and-password/
const LEN = 256;
const SALT_LEN = 64;
const ITERATIONS = 10000;
const DIGEST = "sha256";

/**
 * Hashes a password.
 *
 * @param {String} password Password to hash.
 * @param {String / function} Salt or callback in order to generate a new salt. The callback will be given an error as
 *                            the first parameter, if such occurs, the hashed password in hexadecimal representation as
 *                            the second parameter, and the new salt as third.
 * @param {Functon} callback Callback which will be given an error as the first parameter, if such occurs, and the hash
 *                           of the provided password and salt as the second parameter.
 */
var hashPassword = function (password, salt, callback) {
  var len = LEN / 2;

  // If provided a salt, hash and salt the password with the needed amount of iterations,
  // and then return the derived key in hexadecimal representation.
  if (arguments.length === 3) {
    crypto.pbkdf2(password, salt, ITERATIONS, len, DIGEST, function (err, derivedKey) {
      if (err) {
        return callback(err);
      }

      return callback(null, derivedKey.toString("hex"));
    });
  } else {
    // No salt was given, so calculate a salt, hash the password, and return both.
    callback = salt;
    crypto.randomBytes(SALT_LEN / 2, function (err, salt) {
      if (err) {
        return callback(err);
      }

      salt = salt.toString("hex");
      crypto.pbkdf2(password, salt, ITERATIONS, len, DIGEST, function (err, derivedKey) {
        if (err) {
          return callback(err);
        }

        callback(null, derivedKey.toString("hex"), salt);
      });
    });
  } // end if
};

/**
 * Checks whether the plain text password matches the hashed one.
 *
 * @param {String} plainText Plain text password to hash and salt to check.
 * @param {String} hashed Hashed and salted version of the stored password.
 * @param {String} salt Salt used to hash the password.
 * @param {Function} callback Standard node.js callback, where the first parameter is the error, if any, and the second
 *                            one is a boolean showing whether the plain and hashed passwords have matched or not.
 */
var checkPassword = function (plainText, hashed, salt, callback) {
  hashPassword(plainText, salt, function (err, newHashed) {
    if (err) {
      return callback(err);
    }

    var match = (newHashed === hashed);
    callback(null, match);
  });
};

// Export the needed functions and variables.
var crypt = module.exports = {};
crypt.hashPassword = hashPassword;
crypt.checkPassword = checkPassword;
