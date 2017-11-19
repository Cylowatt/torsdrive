"use strict";

module.exports = function (passport, LocalStrategy, User, func, crypto, strings) {

  /**
   * Way for passport.js to store user data locally.
   */
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  /**
   * Way for passport.js to get user data.
   */
  passport.deserializeUser(function (id, done) {
    User.findOne({where: {id: id}}).then(function (user) {
        // Return the user on success.
        done(null, user);

    }).catch(function (error) {

      // On failure, return the error.
      done(error, null);
    });
  });

  passport.use("local", new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
  }, function (email, plainPassword, done) {

    User.findOne({where: {email: email}}).then(function (user) {

      // If no user was found, return the undefined/empty pointer.
      if (!user) {
        return done(user, null);
      }

      // The password is a single field separated with a separtor.
      var passwordFull = user.password.split(strings.passwordSeparator);
      var hashed = passwordFull[0];
      var salt = passwordFull[1];

      // Make sure that the plaintext password matches the hash.
      crypto.checkPassword(plainPassword, hashed, salt, function (error, match) {
        if (error) {
          return done(error, null);
        } else if (!match) {
          return done(null, false, { message: "Invalid credentials for ${email}."});
        }

        // Remove the password, from the resulting object and return it.
        user.password = undefined;
        return done(null, user);
      });
    }).catch(function (error) {
      // On error, simply return the error.
      return done(error, null);
    });
  }));

}
