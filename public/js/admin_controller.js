"use strict";

/*
Copyright (c) 2017 Pavel Solodilov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var app = angular.module("loopServer", []);
app.controller("adminController", function ($scope, $http, $timeout, $interval) {
  var apis = {
    adminLogin: function () {
      return "/users/api/adminLogin";
    },

    getUserListing: function () {
      return "/users/api/adminGetUserListing";
    },

    getAvailableLanguages: function () {
      return "/api/getAvailableLanguages";
    },

    setPassword: function () {
      return "/users/api/adminSetPassword";
    },

    setUsername: function () {
      return "/users/api/adminSetUsername";
    },

    setEmail: function () {
      return "/users/api/adminSetEmail";
    },

    setPreferredLanguage: function () {
      return "/users/api/adminSetLanguage";
    }
  };

  $scope.aVars = {
    users: {},
    loading: false,
    modifiedUser: null,
    availableLanguages: {},
    roles: []
  };



  $scope.aVars.user = {
      email: null,
      password: null,
      isAdmin: false
  };

  $scope.func = {
    adminLogin: adminLogin,
    editUser: editUser,
    modifyUser: modifyUser
  };


  function toast(text) {
      Materialize.toast(text, 5000);
  }

  function adminLogin () {

    var credentials = {
      email: $scope.aVars.user.email,
      password: $scope.aVars.user.password
    };

    $http.post(apis.adminLogin(), credentials).then(function () {

      $scope.aVars.loading = true;
      $scope.aVars.user.isAdmin = true;
      $scope.aVars.user.password = "";

      $http.get(apis.getAvailableLanguages()).then(function (response) {
        $scope.aVars.availableLanguages = response.data.data;
      });

      $http.get(apis.getUserListing()).then(function (response) {
        $scope.aVars.loading = false;
        $scope.aVars.users = response.data.users;
        $scope.aVars.roles = response.data.roles;

      }).catch(function (error) {
        $scope.aVars.loading = false;
        console.log(error);
        toast("Failed to fetch users.\n" + JSON.stringify(error));
      })
    }).catch(function (error) {
      $timeout(function () {
        $("#modal-form-login").modal("open");
      }, 500);

      console.log(error);
      toast("Not logged in as admin.");
    });
  }


  function editUser(user) {
    $scope.aVars.modifiedUser = {
      id:       user.id,
      username: user.username,
      email:    user.email,
      preferredLanguage: user.preferredLanguage,
      parent: user
    };

    $("#modal-edit-user").modal("open");
  }


  function modifyUser() {
    var modified = $scope.aVars.modifiedUser;
    var parent = modified.parent;

    var doneCount = 0;
    var doneOnCount = 0;
    var errors = [];

    if (modified.username !== parent.username) {
      doneOnCount++;
      $http.post(apis.setUsername(), {
        userId: modified.id,
        username: modified.username
      }).then(function () {
        doneCount++;
        parent.username = modified.username;
      }).catch(function (error) {
        error._errorSource = "username";
        errors.push(error);
      });
    }


    if (modified.email !== parent.email) {
      doneOnCount++;
      $http.post(apis.setEmail(), {
        userId: modified.id,
        email: modified.email
      }).then(function () {
        doneCount++;
        parent.email = modified.email;
      }).catch(function (error) {
        error._errorSource = "email";
        errors.push(error);
      });
    }


    if (modified.preferredLanguage !== parent.preferredLanguage) {
      doneOnCount++;
      $http.post(apis.setPreferredLanguage(), {
        userId: modified.id,
        preferredLanguage: modified.preferredLanguage
      }).then(function () {
        doneCount++;
        parent.preferredLanguage = modified.preferredLanguage;
      }).catch(function (error) {
        error._errorSource = "preferred language";
        errors.push(error);
      });
    }


    if (modified.password && modified.password.length >= 7) {
      doneOnCount++;
      $http.post(apis.setPassword(), {
        userId: modified.id,
        password: modified.password
      }).then(function () {
        modified.password = "";
        doneCount++;
      }).catch(function (error) {
        error._errorSource = "password";
        errors.push(error);
      });
    }

    var errorChecker = $interval(function () {

      var message = "User modified";
      if (doneOnCount === 0) {
        message = "No changes";
      }

      if (doneCount === doneOnCount) {
        toast(message);
        $("#modal-edit-user").modal("close");
        return $interval.cancel(errorChecker);
      }

      if (errors.length == 0) return;

      while (errors.length > 0) {
        console.log(errors[0]);
        toast("Issue with " + errors[0]._errorSource + ".\n See browser console for more information.");
        errors.splice(0, 1);
      }

    }, 200);
  }


  $(".modal").modal();
  adminLogin();
});
