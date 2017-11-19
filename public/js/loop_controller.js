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
app.controller("loopController", function ($scope, $http, $timeout, $window) {

  /**
   * Contains controller-related variables, such as API names.
   * All of them are functions that transform the given data bits.
   */
  var ctrlVars = {};

  /**
   * Contains API names.
   * All of them are functions that transform the given data bits.
   */
  var apis = {
    getUserTransforms: function (segmentId) {
      return "/users/api/getUserTransforms?segment=" + segmentId;
    },

    login: function () {
      return "/users/api/login";
    },

    getUserSegments: function () {
      return "/users/api/getUserSegments";
    },

    logout: function () {
      return "/users/api/logout";
    },

    deleteSegment: function () {
      return "/users/api/deleteSegment";
    },

    deleteTransform: function () {
      return "/users/api/deleteTransform";
    },

    getSegment: function (segmentId) {
      return "/api/getPdb?pdb=" + segmentId;
    },

    getTransform: function (transformId) {
      return "/api/getPdb?pdb=" + transformId + "&pdbtype=transform";
    },

    getLanguage: function (language) {
      return "/lang/" + language + ".json";
    },

    getTorsions: function (segmentId) {
      return "/api/getTorsions?tors=" + segmentId;
    },

    segmentCut: function () {
      return "/api/databasePdb";
    },

    transform: function () {
      return "/api/transformPdb";
    },

    getTransformMeta: function (transformId) {
      return "/api/getPdbMeta?pdb=" + transformId + "&pdbtype=transform";
    },

    getSegmentMeta: function (segmentId) {
      return "/api/getPdbMeta?pdb=" + segmentId;
    },

    getPreferredLanguage: function () {
      return "/users/api/getPreferredLanguage";
    },

    setPreferredLanguage: function () {
      return "/users/api/setPreferredLanguage";
    },

    userSignup: function () {
      return "/users/api/signUp";
    },

    getAvailableLanguages: function () {
      return "/api/getAvailableLanguages"
    },

    shareTransformOnMain: function () {
      return "/users/api/shareTransformOnMain";
    }
  };

  /**
   * Contains controller-related functions.
   */
  var ctrlFunc = {
    fileSet: fileSet,


    toast: function (text) {
      Materialize.toast(text, 5000);
    }
  };

  /**
   * Constains all of the functions within the scope.
   */
  $scope.func = {
    login: login,
    logout: logout,
    signUp: signUp,
    loadLanguage: loadLanguage,
    shareSegment: shareSegment,
    sharePdb: sharePdb,
    shareTransform: shareTransform,
    deleteSegment: deleteSegment,
    deleteTransform: deleteTransform,
    deletePdb: deletePdb,
    downloadSegment: downloadSegment,
    downloadTransform: downloadTransform,
    downloadCurrentPdb: downloadCurrentPdb,
    shareCurrentPdb: shareCurrentPdb,
    getSegmentTransforms: getSegmentTransforms,
    copyToClipboard: copyToClipboard,
    downloadPdb: downloadPdb,
    showContextMenu: showContextMenu,
    validEmail: validEmail,
    shareTransformOnMain: shareTransformOnMain
  };


  /**
   * Contains view-related functions within the scope.
   */
  $scope.func.view = {
    showTransformSideNavbar: showTransformSideNavbar,
    hideSideNavbar: hideSideNavbar,
    toggleJsmolPlay: toggleJsmolPlay,
    detectJsmolRangeChange: detectJsmolRangeChange,
    hideNavbarContextMenu: hideNavbarContextMenu,
    segmentStage: segmentStage
  };

  /**
   * Contains all of the Angular - thus the prefix 'a' - variables needed by the scope.
   */
  $scope.aVars = {
    lang: _lang,
    showOnMain: false
  };

  /**
   * Contains all of the user data values needed by the scope.
   */
  $scope.aVars.user = {
    email: null,
    password: null,
    loggedIn: false
  };

  /**
   * Contains a number of segments previously stored by the user. Objects are indexed by their segment IDs.
   * @see $scope.aVars.currentSegment for each segment's structure.
   */
  $scope.aVars.userSegments = {};

  /**
   * Contains data about the segment currently displayed to the user.
   *
   * @param {String} id Unique ID of the segment.
   * @param {String} pdbCode PDB code of the segment if it was loaded from the protein databank. Otherwise will be null.
   * @param {String} name Name of the segment given by the user. Will be 'Segment X' by default, where X is simply an
   *                      ordinal based on the date when the segment has been created/stored.
   * @param {String} chain Name of the chain of this segment. This is mandatory
   *                          //TODO why is the chain needed?
   * @param {Number} start Position of the first backbone atom of the segment (in full structure).
   * @param {Number} end Position of the last backbone atom of the segment (in full structure).
   * @param {Array} torsions Initial torsion values for each phi/psi torsion of the segment. Given in form of an array
   *                         of objects of structure {num: ORDINAL, type: "phi/psi", value: TORSION_VALUE,
   *                         constrained: true/false} TODO value range? -180 to 180?
   * @param {Boolean} shared True to allow access to this segment via URL to anyone.
   * @param {Boolean} showOnMain True to show this segment on the main page: public access.
   * @param {String} ownerContact Email/phone number, etc. of the owner of this segment.
   * @param {String} ownPdbObject String containing user's own PDB file. Is only used in the modifiedSegment.
   */
  $scope.aVars.currentSegment = {
    id:           null,
    pdbCode:      null,
    name:         null,
    chain:        null,
    start:        null,
    end:          null,
    torsions:     null,
    shared:       null,
    showOnMain:   null,
    ownerContact: null
  };

  /**
   * This is to represent segment data before cutting it.
   * @see $scope.aVars.currentSegment above.
   */
  $scope.aVars.modifiedSegment = {
    pdbCode:      null,
    name:         null,
    chain:        "A",
    start:        null,
    end:          null,
    shared:       null,
    showOnMain:   null,
    ownPdbObject: null
  };

  /**
   * Contains data about the transform currently diplayed to the user.
   *
   * @param {String} id ID of the transform
   * @param {Number} numModels Total amount of models in the transform.
   * @param {Array} transformMeta Contains metadata about the transform in form of an array of objects:
   *      [{"num": index_of_backbone_atom,
   *      "type": "phi/psi",
   *      "resultTorsion": resulting_torsion_value,
   *      "requestedTorsion": requested_torsion_value,
   *      "deviation": delta_of_values},
   *      ...
   *      ]
   */
  $scope.aVars.currentTransform = {
    id: null,
    numModels: 0,
    transformMeta: null
  };

  /**
   * Contains the view-related values (e.g. when to show or hide an element).
   * @param {Object} selectedNavbarSegment Currently selected segment at the navigation bar.
   * @param {Object} selectedNavbarTransform Currently selected transform at the navigation bar.
   * @param {Boolean} jsmolPlay Set to launch JSmol animation, and unset to stop it.
   * @param {Boolean} showTorsionForm Set to show input form for torsions to transform from a segment.
   * @param {Boolean} showTranformDetails Set to show details of a transform when showing a transform.
   */
  $scope.aVars.view = {
    selectedNavbarSegment:   null,
    jsmolPlay:               null,
    showTorsionForm:         null,
    showTranformDetails:     null,
    selectedNavbarSegment:   {},
    selectedNavbarTransform: {},
    jsmolModel:              1,
    toastTimeout:            7500,
    currentStage:            CONSTS.STAGE.CUTFORM
  };

  function store() {
    return (typeof (Storage) !== "undefined");
  }

  if (store()) {
    if (localStorage.loggedIn) {
      login(function (couldLogin) {
        if (!couldLogin) {
          localStorage.loggedIn = false;
        }
      }, true);
    }

    if (localStorage.preferredLanguage) {
        loadLanguage(localStorage.preferredLanguage);
    }

  } else {
    ctrlFunc.toast($scope.aVars.lang.errLocalStorageUnavailable);
  }

  /**
   * Returns true if the provided email is in correct format. Does not guarantee that it is a functioning email, though.
   *
   * @param {String} email Email to validate.
   * @return {Boolean} True if the given email is in correct format.
   */
  function validEmail(email) {
    var regex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    return regex.test(email);
  }

  function hideNavbarContextMenu() {
    var menu = $("#user-buttons-context-menu");
    menu.fadeOut(300);

    $("#context-menu-canceller").hide();
  }

  /**
   * Shows the navigation bar context menu.
   *
   * @param {Object} event Click event.
   * @param {String} type Type of context menu to show ('transform' or 'segment');
   * @param {String} id ID of the PDB of this context menu.
   * @param {String} name Name of the PDB of this context menu.
   */
  function showContextMenu (event, type, id, name) {
    $scope.aVars.view.contextMenuType = type;
    $scope.aVars.view.contextMenuId = id;
    $scope.aVars.view.contextMenuMeta = name;

    var menu = $("#user-buttons-context-menu");
    var left = event.clientX + "px";
    var top = event.clientY + "px";

    menu.css({
      left: left,
      top: top
    });

    $("#context-menu-canceller").show();

    menu.fadeIn(300);
  }


  /**
   * Shows the transform navigation bar sidebar with transforms relating to the provided segment ID.
   *
   * @param {Number} id ID of the segment that has been selected. If it matches a currently active one, this function
   *                    does nothing.
   */
  function showTransformSideNavbar(id) {
    hideNavbarContextMenu();

    // A segment is selected in the navigation bar.
    var segmentSelected = $scope.aVars.view.selectedNavbarSegment;

    // If a segment is selected and the same one is clicked again.
    var clickedOnSelected = segmentSelected && ($scope.aVars.view.selectedNavbarSegment.id === id);

    // If clicked the current segment, do nothing.
    if (clickedOnSelected) return;

    // If got there, set the selected segment, unselect the transform, and animate the transform navigation bar.
    $scope.aVars.view.selectedNavbarSegment = $scope.aVars.userSegments[id];
    $scope.aVars.view.selectedNavbarTransform = {};
    view.showTransformSideNavbar(id);
  }


  /**
   * Hide the side navigation bar completely.
   * Also clears the selected segment and transform objects.
   */
  function hideSideNavbar() {
    // Reset the selected objects and hide the navigation bar using the view object.
    $scope.aVars.view.selectedNavbarSegment = {};
    $scope.aVars.view.selectedNavbarTransform = {};
    hideNavbarContextMenu();
    view.hideSideNavbar();
  }


  /**
   * Retrieves the segment transforms for a given segment for the current user from the server.
   * Does nothing if the user is not logged in.
   *
   * @param {String} segmentId ID of the segment to get transforms of.
   */
  function getSegmentTransforms(segmentId) {

    // Ignore a not logged in user.
    if (!$scope.aVars.user.loggedIn) return;

    // Try getting the transforms.
    $http.get(apis.getUserTransforms(segmentId)).then(function (transforms) {

      // Of success, check if the segment object contains a 'transforms' object.
      // If not, create it.
      if (!$scope.aVars.userSegments[segmentId].transforms) {
        $scope.aVars.userSegments[segmentId].transforms = {};
      }

      // Add all of the transforms into the transforms of the user segments.
      for (var key in transforms.data) {
        if (key != "_meta") {
          console.log(transforms.data[key]);
          $scope.aVars.userSegments[segmentId].transforms[key] = transforms.data[key];
        }
      }
    }).catch(function (error) {
      ctrlFunc.toast($scope.aVars.lang.errLoadingSegmentTransforms + errMsg(error));
    });
  }

  /**
   * Tries to sign up a user using the data in the sign up form.
   */
  function signUp() {

    var postJson = {
      email: $scope.aVars.user.email,
      password: $scope.aVars.user.password,
      preferredLanguage: $scope.aVars.lang.id
    }

    $http.post(apis.userSignup(), postJson).then(function (response) {
      ctrlFunc.toast($scope.aVars.lang.signUpSuccess);
      login();
    }, function (error) {
      ctrlFunc.toast($scope.aVars.lang.errSignUpFailure, + errMsg(error));
    });
  }

  /**
   * Tries to log a user in using the data in the login form.
   *
   * @callback Will return a single value: true if login has succeeded. Optional parameter.
   */
  function login(callback, initial) {

    // This is the data to send to the server.
    var postJson = {
      email: $scope.aVars.user.email,
      password: $scope.aVars.user.password
    };

    // Try doing the post.
    $http.post(apis.login(), postJson).then(function (response) {

      // On success, set the logged in flag and clear the password for security reasons.
      $scope.aVars.user.loggedIn = true;
      if (store()) {
        localStorage.loggedIn = true;
      }

      $scope.aVars.user.password = "";

      $http.get(apis.getPreferredLanguage()).then(function (langRes) {
        loadLanguage(langRes.data.lang);
      });

      // Load the user's segments.
      $http.get(apis.getUserSegments()).then(function (segments) {

        // On success, add the segment data into the segment store.
        for (var key in segments.data) {
          if (key != "_meta") {
            $scope.aVars.userSegments[key] = segments.data[key];
          }
        }

        if (callback) callback(true);

      }, function (segmentError) {

          ctrlFunc.toast($scope.aVars.lang.errLoadingUserSegments + errMsg(segmentError));
        if (callback) callback(null);
      });

      // Close the modal if could log in.
      $("#modal-form-login").modal("close");
    }, function (error) {
      $scope.aVars.user.loggedIn = false;
      if (store()) {
        localStorage.loggedIn = false;
      }

      if (!initial) {
        ctrlFunc.toast($scope.aVars.lang.errLoginFailure + errMsg(error));
      }

      if (callback) callback(null);
    });
  }

  /**
   * Extracts an error message from the error object.
   */
  function errMsg(error) {

    var msg = "";
    var meta;
    var code;

    if (error["_meta"]) {
      meta = error["_meta"];
    } else if (error.data && error.data["_meta"]) {
      meta = error.data["_meta"];
    } else {
      return msg;
    }

    if (meta.code) {
      var errCode = meta.code.toString();
      var errMeta = "";

      var splitCode = errCode.split("::::");
      if (splitCode && splitCode.length > 1) {
        errCode = splitCode[0];
        errMeta = " [" + splitCode[1] + "]";
      }

      if (meta.code == 300 || meta.code == 301) {
        $scope.aVars.user.loggedIn = false;
        localStorage.loggedIn = false;
      }

      msg = ": " + $scope.aVars.lang.errCodes[errCode] + " (" + errCode + ")" + errMeta;
    }


    return msg;
  }


  /**
   * Logs the user out. Does not inform the user of success/failure of the operation.
   */
  function logout() {
    hideNavbarContextMenu();

    $http.get(apis.logout());
    if (store()) {
      localStorage.loggedIn = false;
    }

    $scope.aVars.user.loggedIn = false;
  }

  /**
   * Opens a modal showing a link to share, which consists of the current website's path with given query string.
   * E.g. http://site.ac.uk/?YOUR_QUERY_STRING
   *
   * @param {String} queryString Query string to append to the shared URL (without the preceding question mark '?').
   */
  function shareQuery(queryString) {
    var loc = window.location;
    var href = loc.href.split("#")[0];

    $scope.aVars.view.sharedUrl = href + "?" + queryString;
    $("#modal-share").modal("open");
  }

  /**
   * Shows a modal with shared info.
   *
   * @param {String} type Type of the PDB to share ('transform' or 'segment');
   * @param {String} id ID of the PDB to share.
   */
  function sharePdb(type, id) {
    if (type === "transform") {
      shareTransform(id);
    } else if (type === 'segment') {
      shareSegment(id);
    }
  }

  /**
   * Shows a modal with shared segment info.
   *
   * @param {String} segmentId ID of the segment to share.
   */
  function shareSegment(segmentId) {
    shareQuery("segment=" + segmentId);
  }

  /**
   * Shows a modal with shared transform info.
   *
   * @param {String} transformId ID of the transform to share.
   */
  function shareTransform(transformId) {
    shareQuery("transform=" + transformId);
  }

  /**
   * Copies provided text to clipboard, and then shows a toast saying that it has been copied.
   */
  function copyToClipboard(toCopy) {
    var temp = $("<input>");
    $("body").append(temp);
    temp.val(toCopy).select();
    document.execCommand("copy");
    temp.remove();

    ctrlFunc.toast($scope.aVars.lang.msgCopiedToClipboard);
  }

  /**
   * Deletes a user's PDB. Does not inform the user of success/failure of the operation, but asks if the user is sure
   * beforehand.
   *
   * @param {String} type Type of PDB to delete ('transform' or 'segment').
   * @param {String} id ID of the PDB to delete.
   */
  function deletePdb(type, id) {
    if (type === "transform") {
      deleteTransform(id);
    } else if (type === "segment") {
      deleteSegment(id);
    }
  }

  /**
   * Deletes a user's segment. Does not inform the user of success/failure of the operation.
   *
   * @param {String} segmentId ID of the segment to delete.
   */
  function deleteSegment(segmentId) {
    // Don't show the user how successful that was.
    $http.post(apis.deleteSegment(), {segmentId: segmentId});

    // Remove the segment from storage.
    delete $scope.aVars.userSegments[segmentId];
  }

  /**
   * Deletes a user's transform. Does not inform the user of success/failure of the operation.
   *
   * @param {String} segmentId ID of the segment that the transform belongs to.
   * @param {String} transformId ID of the transform to delete.
   */
  function deleteTransform(segmentId, transformId) {
    // Don't show the user how successful that was.
    $http.post(apis.deleteTransform(), {transformId: transformId});

    // Remove the transform from storage.
    delete $scope.aVars.userSegments[segmentId].transforms[transformId];
  }

  /**
   * Downloads a PDB based on type.
   *
   * @param {String} type 'transform' for transform, and 'segment' for segment.
   * @param {String} id ID of the segment or transform to download.
   * @param {String} name Name of the file to download the PDB with (without .pdb extension).
   */
  function downloadPdb(type, id, name) {
    if (type === "transform") {
      downloadTransform(id, name);
    } else if (type === "segment") {
      downloadSegment(id, name);
    }
  }

  /**
   * Downloads a segment for the user to store offline.
   */
  function downloadSegment(segmentId, segmentName) {
    // If Chrome.
    if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
      view.downloadUri(apis.getSegment(segmentId), segmentName + ".pdb");
    } else {
      $window.open(apis.getSegment(segmentId));
    }
  }

  /**
   * Downloads a tranform for the user to store offline.
   */
  function downloadTransform(transformId, transformName) {
    // If Chrome.
    if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
      view.downloadUri(apis.getTransform(transformId), transformName + ".pdb");
    } else {
      $window.open(apis.getTransform(transformId));
    }
  }

  /**
   * Downloads the PDB structure file depending on the currently selected stage.
   * If segment view, downloads the segment PDB. If transform view, downloads the transform PDB.
   */
  function downloadCurrentPdb() {
    if (vars.currentStage === CONSTS.STAGE.SEGMENT) {
      downloadSegment($scope.aVars.currentSegment.id, $scope.aVars.currentSegment.pdbCode);
    } else if (vars.currentStage === CONSTS.STAGE.TRANSFORM) {
      downloadTransform($scope.aVars.currentTransform.id, $scope.aVars.currentTransform.id);
    }
  }

  /**
   * Shares the PDB segment/transform.
   * In segment view, shares the segment PDB. In transform view, shared the transform pdb.
   */
  function shareCurrentPdb() {
    if (vars.currentStage === CONSTS.STAGE.SEGMENT) {
      shareSegment($scope.aVars.currentSegment.id);
    } else if (vars.currentStage === CONSTS.STAGE.TRANSFORM) {
      shareTransform($scope.aVars.currentTransform.id);
    }
  }

  $scope.aVars.modifiedSegment.ownPdbObject = undefined;

  //$scope.aVars.modifiedSegment.pdbCode = "1adg";
  //$scope.aVars.modifiedSegment.chain = "A";
  ///$scope.aVars.modifiedSegment.start = 290;
  //$scope.aVars.modifiedSegment.end = 301;


  /**
   * Collects the data from the segment cut form and sends it over to the server.
   */
  $scope.segmentCut = function () {

      // Start loading.
      view.showLoading(true);


      // Attach the data to be sent to the server.
      var pdbJson = {
        "chain":  $scope.aVars.modifiedSegment.chain,
        "start":  $scope.aVars.modifiedSegment.start,
        "end":    $scope.aVars.modifiedSegment.end
      };

      // Add name and own object if own object, and PDB code otherwise.
      if ($scope.aVars.modifiedSegment.ownPdb) {
        pdbJson.name         = $scope.aVars.modifiedSegment.name;
        pdbJson.ownPdbObject = $scope.aVars.modifiedSegment.ownPdbObject;
      } else {
        pdbJson.pdbCode = $scope.aVars.modifiedSegment.pdbCode;
      }


      // Send the data over to cut the required segment.
      $http.post(apis.segmentCut(), pdbJson).then(function (response) {

        var shared = $scope.aVars.modifiedSegment.ownPdb !== null && $scope.aVars.modifiedSegment.ownPdb !== undefined;
        var segName = $scope.aVars.modifiedSegment.name;
        if (!segName) {
            segName = response.data.name;
        }

        // Set the current segment.
        $scope.aVars.currentSegment = {
          "name":    segName,
          "pdbCode": $scope.aVars.modifiedSegment.pdbCode,
          "chain":   $scope.aVars.modifiedSegment.chain,
          "start":   $scope.aVars.modifiedSegment.start,
          "end":     $scope.aVars.modifiedSegment.end,
          "id":      response.data.pdb,
          "shared":  shared
        };

        // Save the current segment into user's local segments.
        $scope.aVars.userSegments[$scope.aVars.currentSegment.id] = {
          "name":    $scope.aVars.currentSegment.name,
          "pdbCode": $scope.aVars.currentSegment.pdbCode,
          "chain":   $scope.aVars.currentSegment.chain,
          "start":   $scope.aVars.currentSegment.start,
          "end":     $scope.aVars.currentSegment.end,
          "id":      response.data.pdb,
          "shared":  shared
        };

        // Get the torsions.
        segmentStage($scope.aVars.currentSegment.id, function (segStageError) {
          if (segStageError) {
            // On error, display the error.
            ctrlFunc.toast($scope.aVars.lang.errLoadingSegmentMetadata + " (" + response.data.pdb + ") " + errMsg(segStageError));
          }

          view.showLoading(false);
        });
      }, function (error) {
        // On error, display the error.
        ctrlFunc.toast($scope.aVars.lang.errCuttingSegment + errMsg(error));
        view.showLoading(false);
      });
  };

  /**
   * Transitions to the segment view stage using the currentSegment object in the scope.
   *
   * @param {String} segmentId ID of the segment to show.
   */
  function segmentStage(segmentId, callback) {
    $scope.aVars.currentTransform = {};

    // Navigation bar call.
    if ($scope.aVars.userSegments[segmentId]) {
      $scope.aVars.currentSegment = $scope.aVars.userSegments[segmentId];
    }

    // Show the torsion form, hide transform details, and change the active stage variable to segment.
    $scope.aVars.view.showTorsionForm = true;
    $scope.aVars.view.showTransformDetails = false;
    $scope.aVars.view.currentStage = CONSTS.STAGE.SEGMENT;

    // Set initial values for target arrays.
    $scope.aVars.currentSegment.targetPsi = [];
    $scope.aVars.currentSegment.targetPhi = [];
    $scope.aVars.currentSegment.constrPsi = [];
    $scope.aVars.currentSegment.constrPhi = [];
    $scope.aVars.currentSegment.torsions = {};

    // Get the initial torsions for the segment.
    $http.get(apis.getTorsions(segmentId)).then(function (torsResponse) {

      // On success, set the torsions to the current segment.
      $scope.aVars.currentSegment.torsions = torsResponse.data.tors;
      $scope.aVars.currentSegment.shared = torsResponse.data.shared;

      // Transition to segment stage.
      view.goToSegmentStage(apis.getSegment(segmentId), function () {
        // Show the torsion form and return a clean callback.
        $scope.aVars.view.showTorsionForm = true;

        // Hide the loading.
        view.showLoading(false);
        if (callback) callback(null);
      });
    }, function () {
      // Hide the loading.
      view.showLoading(false);
      if (callback) callback(null);
    });
  };

  /**
   * Sets the model and the UI to transition to the transform stage without performing the segment transform.
   *
   * @param {String} segmentId ID of the segment that the transform belongs to.
   * @param {String} transformId ID of the transform that the segment belongs to.
   * @param {Function} callback Callback to call after the function is done. The first parameter is an error, or null if
   *                            no error has happened.
   */
  $scope.transformStage = function (segmentId, transformId, callback) {
    view.showTorsionFormSendButton(false);

    if ($scope.aVars.userSegments[segmentId]) {
      $scope.aVars.currentSegment = $scope.aVars.userSegments[segmentId];
    }

    if (!$scope.aVars.currentSegment.torsions || $scope.aVars.currentSegment.torsions.length === 0) {
      $http.get(apis.getTorsions(segmentId)).then(function (torsions) {
        $scope.aVars.currentSegment.torsions = torsions.data.tors;
      });
    }

    $scope.aVars.view.currentStage = CONSTS.STAGE.TRANSFORM;
    $scope.aVars.currentTransform.id = transformId;

    $http.get(apis.getTransform(transformId)).then(function (pdbResponse) {
      $scope.aVars.currentTransform.pdbData = pdbResponse.data;

      $scope.aVars.view.jsmolPlay = true;

      view.goToTransformStage(pdbResponse.data, function () {

        // Hide the torsion form and show the transform details.
        $scope.aVars.view.showTorsionForm = false;
        $scope.aVars.view.showTransformDetails = true;

        var parentSegment = $scope.aVars.userSegments[segmentId];
        if (parentSegment) {
          if (!parentSegment.transforms) {
            parentSegment.transforms = {};
          }

          if (!parentSegment.transforms[transformId]) {
            parentSegment.transforms[transformId] = {
              id: transformId,
              name: transformId
            }
          }
        }

        $scope.aVars.currentTransform.numModels = 0;
        setTimeout( function () {
          $scope.aVars.currentTransform.numModels = jsmolApp._getPropertyAsArray("modelInfo.models").length;
        }, 500);

        if (callback) callback();
      });
    }, function (pdbError) {
      if (callback) callback(pdbError);
    });
  };

  /**
   *
   */
  $scope.segmentTransform = function () {

    // Start loading.
    view.showLoading(true);

    // Set initial values to target arrays.
    $scope.aVars.currentSegment.targetPsi = [];
    $scope.aVars.currentSegment.targetPhi = [];
    $scope.aVars.currentSegment.constrPsi = [];
    $scope.aVars.currentSegment.constrPhi = [];
    $scope.aVars.currentTransform.numModels = undefined;

    // Initialise local variables.
    var torsion;
    var index;
    var postfix;
    var i = 0;

    // Go through each of the contained torsions, extracting only modified values.
    for (i; i < $scope.aVars.currentSegment.torsions.length; i++) {

      // Keep reference to the torsion object.
      torsion = $scope.aVars.currentSegment.torsions[i];
      index = torsion.num;

      // Determine the postfix of the torsion to be added.
      postfix = ((torsion.type === "psi") ? "Psi" : "Phi");

      if (torsion.constrained) {
        // If the torsion was constrained, detect which torsion is to be constrained (phi or psi), and add to the
        // corresponding constrained array.
        $scope.aVars.currentSegment["constr" + postfix].push(index);

      } else if (angular.isNumber(torsion.newValue)) {
        // If the new value was provided and the torsion was not constrained, add the index and the new value into the
        // corresponding target array.
        $scope.aVars.currentSegment["target" + postfix].push({
          "res": index,
          "targetTors": torsion.newValue
        });
      } // end if
    } // end for

    // Construct the JSON to post to the transform API.
    var postJson = {
      "segmentId": $scope.aVars.currentSegment.id,
      "targetPsi": $scope.aVars.currentSegment.targetPsi,
      "targetPhi": $scope.aVars.currentSegment.targetPhi,
      "constrPsi": $scope.aVars.currentSegment.constrPsi,
      "constrPhi": $scope.aVars.currentSegment.constrPhi,
      "showOnMain": $scope.aVars.showOnMain
    };

    $scope.aVars.showOnMain = false;

    // Post the data to the transform API.
    $http.post(apis.transform(), postJson).then(function (response) {

      $scope.aVars.currentTransform.id = response.data.pdb;
      $scope.aVars.currentTransform.segment = $scope.aVars.currentSegment.id;
      $scope.transformStage($scope.aVars.currentSegment.id, response.data.pdb, function (error) {

        // On success, get the PDB model from the server

        $http.get(apis.getTransformMeta($scope.aVars.currentTransform.id)).then(function (metaResp) {
          $scope.aVars.currentTransform.transformMeta = metaResp.data.transformMeta;

          view.showLoading(false);
        }, function (error) {
          ctrlFunc.toast($scope.aVars.lang.errLoadingTransformMetadata + " (" + response.data.pdb + ")" + errMsg(error));
          view.showLoading(false);
        });
      });
    }, function (error) {
      ctrlFunc.toast($scope.aVars.lang.errTransformSegment + " (" + $scope.aVars.currentSegment.id + ")" + errMsg(error));
      view.showLoading(false);
    });
  };

  $scope.func.view.toCutForm = function () {
    $scope.aVars.view.currentStage = CONSTS.STAGE.CUTFORM;
    view.goToCutFormStage();
  }

  $scope.func.toSegment = function () {
    $scope.aVars.view.currentStage = CONSTS.STAGE.SEGMENT;
    $scope.aVars.view.showTransformDetails = false;
    $scope.aVars.view.showTorsionForm = true;
    $scope.aVars.view.jsmolModel = 1;
    if (vars.showingRightBar) {
      view.showTorsionFormSendButton(true);
    }

    detectJsmolRangeChange();

    view.goToSegmentStage(null, null, true);
  };

  $scope.func.toTransform = function () {
    $scope.aVars.view.currentStage = CONSTS.STAGE.TRANSFORM;
    $scope.aVars.view.showTorsionForm = false;
    $scope.aVars.view.showTransformDetails = true;
    view.showTorsionFormSendButton(false);
    $scope.aVars.view.jsmolPlay = true;

    view.goToTransformStage(null, null, true);
  }

  /**
   * Loads a language with the given language code.
   *
   * @param {String} language Language code to load, e.g. "en", "ru", "jp".
   */
  function loadLanguage (language) {
    var oldId = $scope.aVars.lang.id;
    $http.get(apis.getLanguage(language)).then(function (res) {
      $scope.aVars.lang = res.data;

      if ($scope.aVars.lang.id !== oldId) {
        if (store()) {
          localStorage.preferredLanguage = language;
        }

        if ($scope.aVars.user.loggedIn) {
          $http.post(apis.setPreferredLanguage(), {lang: language});
        }
      }

      // Update the tooltips after the new language has been loaded.
      $timeout(function () {
        $(".tooltipped").tooltip();
      }, 250);

    }).catch(function (error) {
      var langToLoad = $scope.aVars.lang.languages[language];
      if (!langToLoad) {
        langToLoad = language;
      }

      langToLoad = " (" + langToLoad + ")";
      ctrlFunc.toast($scope.aVars.lang.errLoadingLanguage + langToLoad + errMsg(error));
    });
  }

  function loadAvailableLanguages() {
    $http.get(apis.getAvailableLanguages()).then(function (res) {
      $scope.aVars.availableLanguages = res.data.data;
    });
  }

  /**
   * Called whenever the range value for JSmol model changes.
   * Firstly, stops the animation (a precaution).
   * Then unsets the JSmol play flag.
   * Finally, sets the JSmol to point at the model gien by view.jsmolModel flag.
   */
  function detectJsmolRangeChange () {
    Jmol.script(jsmolApp, "frame PAUSE");
    $scope.aVars.view.jsmolPlay = false;
    Jmol.script(jsmolApp, "frame " + $scope.aVars.view.jsmolModel);
  }

  /**
   * Toggles the current state of JSmol to either play or stop playing the animation.
   */
  function toggleJsmolPlay () {

    // Choose an appropriate command. If currently playing, pause. If not, play.
    var play = $scope.aVars.view.jsmolPlay;
    var command = play ? "frame PAUSE" : "frame PLAY";

    // Run the command and toggle the flag.
    Jmol.script(jsmolApp, command);
    $scope.aVars.view.jsmolPlay = !play;
  }


  /**
   * Detects key sequences.
   *
   * Clicks the segment cut submit button on pressing the enter key.
   * Closes the side bar or the language box on pressing the ESC key.
   */
  angular.element(document).on("keydown", function (e) {
    if (e.keyCode == 27) { // ESC key
      if (vars.showingSideNavbar) {
        $scope.func.view.hideSideNavbar();
      } else if (vars.showingLanguageBox) {
        view.hideLanguageBox();
      }
    } else if (e.keyCode == 13) { // Enter key
      if (!vars.showingSideNavbar && !vars.showingLanguageBox && vars.currentStage === CONSTS.STAGE.PRELOAD) {
        $("#button-submit-cut").click();
      }
    }
  });


  /**
   * Extracts data from a loaded text file and loads it into the model in order to be able to send it over to the server
   * as own PDB file.
   * @see https://www.html5rocks.com/en/tutorials/file/dndfiles/
   *
   * @param {Object} event Event of attaching a file to the page via form control.
   */
  function fileSet (evt) {
    var reader = new FileReader();

    // When done loading, load the insides of the file into model.
    reader.onload = function (e) {
      $scope.aVars.modifiedSegment.ownPdbObject = e.target.result;
    }

    // Put text into the target model object.
    reader.readAsText(evt.target.files[0]);
  }

  // Set up a listener for file upload.
  document.getElementById("ownPdbFile").addEventListener("change", ctrlFunc.fileSet, false);


  // Check if the query string is present, and go to appropriate stage depending on its value.
  var queryString = $window.location.search;
  if (queryString && queryString.length > 1 && queryString.startsWith("?")) {
    queryString = queryString.substr(1);
    queryString = queryString.split("&")[0];
    queryString = queryString.split("=");

    if (queryString.length == 2) {
      queryString = {
        key: queryString[0],
        value: queryString[1]
      };

      if (queryString.key === "transform") {
        // Load segment and transform data, go to transform stage.
        transformLoad(queryString.value);
      } else if (queryString.key === "segment") {
        // Load segment data, go to segment stage.
        segmentLoad(queryString.value);
      }
    }
  }

  loadAvailableLanguages();

  /**
   * Loads up transform and segment metadata, and then transitions to transform UI stage.
   *
   * @param {String} id ID of the transform to load.
   */
  function transformLoad(id) {
    $http.get(apis.getTransformMeta(id)).then(function (transform) {
      $scope.aVars.currentTransform = {
        id: id,
        segment: transform.data.segment,
        name: transform.data.name,
        transformMeta: transform.data.transformMeta
      };

      segmentLoad($scope.aVars.currentTransform.segment, true, function () {
        $scope.transformStage($scope.aVars.currentTransform.segment, id);
        $scope.aVars.view.showTorsionForm = false;
        $scope.aVars.view.showTransformDetails = true;
        view.showLoading(false);
      });
    }, function (error) {
      ctrlFunc.toast($scope.aVars.lang.errLoadingMetadata + errMsg(error));
      view.showLoading(false);
    });
  }

  /**
   * Loads segment data into currentSegment.
   * If the justLoad flag is not set, proceeds to segment UI stage.
   *
   * @param {String} id ID of the segment to load.
   * @param {Boolean} justLoad Set to true in order not to go to segment UI stage.
   * @param {Function} callback Callback without parameters. Only called if successful and justLoad is set to true
   *                            (not undefined, null, or false).
   */
  function segmentLoad(id, justLoad, callback) {
    view.showLoading(true);
    $http.get(apis.getSegmentMeta(id)).then(function (segment) {

      // Set the current segment.
      $scope.aVars.currentSegment = {
        "name":    segment.data.name,
        "pdbCode": segment.data.pdbCode,
        "chain":   segment.data.chain,
        "start":   segment.data.start,
        "end":     segment.data.end,
        "id":      id
      };

      if (!justLoad) {
        segmentStage(id);
      }

      if (justLoad && callback) {
        callback();
      } else {
        view.showLoading(false);
      }

    }, function (error) {
      ctrlFunc.toast($scope.aVars.lang.errLoadingMetadata + errMsg(error));
      view.showLoading(false);
    });
  }

  function shareTransformOnMain(segmentId, transformId) {
    var postJson = {transformId: transformId};
    hideNavbarContextMenu();

    $http.post(apis.shareTransformOnMain(transformId), postJson).then(function (response) {
      $scope.aVars.userSegments[segmentId].transforms[transforms].showOnMain = true;
    }).catch(function (error) {
      ctrlFunc.toast(errMsg(error));
    });
  }

});


// https://gist.github.com/BobNisco/9885852
app.directive('onLongPress', function($timeout) {
	return {
		restrict: 'A',
		link: function($scope, $elm, $attrs) {
			$elm.bind('mousedown', function(evt) {
        console.log("TOUCH");
				// Locally scoped variable that will keep track of the long press
				$scope.longPress = true;

				// We'll set a timeout for 600 ms for a long press
				$timeout(function() {
					if ($scope.longPress) {
						// If the touchend event hasn't fired,
						// apply the function given in on the element's on-long-press attribute
						$scope.$apply(function() {
        console.log("EVAL");
							$scope.$eval($attrs.onLongPress)
						});
					}
				}, 600);
			});

			$elm.bind('mouseup', function(evt) {
				// Prevent the onLongPress event from firing
				$scope.longPress = false;
				// If there is an on-touch-end function attached to this element, apply it
				if ($attrs.onTouchEnd) {
					$scope.$apply(function() {
						$scope.$eval($attrs.onTouchEnd)
					});
				}
			});
		}
	};
})


app.directive("fileread", [function () {

  //http://stackoverflow.com/a/17063046
  return {
    scope: {
      fileread: "="
    },
    link: function (scope, element, attributes) {
      element.bind("change", function (changeEvent) {
        var reader = new FileReader();
        reader.onload = function (loadEvent) {
          scope.$apply(function () {
            scope.fileread = loadEvent.target.result;
          });
        }
        reader.readAsDataURL(changeEvent.target.files[0]);
      });
    }
  }
}]);


app.directive("positiveInteger", function () {
  return {
    require: "ngModel",
    link: function (scope, element, attr, mCtrl) {
      function isValid (num) {
        var correct = (0 === num % (!isNaN(parseFloat(num)) && 0 <= ~~num) && num > 0);
        mCtrl.$setValidity("posInt", correct);
        return num;
      }
      mCtrl.$parsers.push(isValid);
    }
  }
});

app.directive("minimumStrengthPassword", function () {
  return {
    require: "ngModel",
    link: function (scope, element, attr, mCtrl) {
        function validPassword(value) {
          if (value.length > 7 && (/\d/.test(value)) && /[a-zA-Z]/.test(value)) {
            mCtrl.$setValidity("okPass", true);
          } else {
            mCtrl.$setValidity("okPass", false);
          }
          return value;
        }
        mCtrl.$parsers.push(validPassword);
    }
  };
});
