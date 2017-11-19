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
app.controller("tutorialController", function ($scope, $http, $window) {

  var defaultLanguageCode = "en";
  var apis = {
    loadTutorial: function (lang) {
      return "/partials/tutorial_" + lang + ".html";
    }
  };

  var tutorialDiv = $("#tutorial-content");


  /**
   * Checks if the local storage is available.
   */
  function store() {
    return (typeof (Storage) !== "undefined");
  }

  /**
   * Loads a tutorial HTML content for the given language.
   * If succeeded, inserts the loaded HTML into the document, and sets the local storage's preferred language to the
   * target language provided that local storage is available. Does nothing if failed.
   *
   * @param {String} languageCode Code of the language to load.
   * @param {Function} callback Callback to call when done. Will have an error as first parameter if failed, and an
   *                            undefined if succeded.
   * @return {Void}
   */
  function loadTutorialForLanguage(languageCode, callback) {
    $http.get(apis.loadTutorial(languageCode)).then(function (response) {

      // Clear the tutorial div and add the tutorial data to it.
      tutorialDiv.empty();
      tutorialDiv.append(response.data);

      // Successful callback.
      callback();

    }).catch(function (error) {
      callback(error);
    });
  }


  /**
   * Tries to load a tutorial using the query string.
   *
   * @param {Function} callback The only parameter passed is the error, and it will be undefined if the call succeeds.
   */
  function tryLoadTutorialUsingQueryString (callback) {

    // Try extracting the query string if present.
    var queryString = $window.location.search;
    if (queryString && queryString.length > 1 && queryString.startsWith("?")) {
      queryString = queryString.substr(1);
      queryString = queryString.split("&")[0];
      queryString = queryString.split("=");

      // Check if in format lang=LANG_CODE or language=LANG_CODE
      if (queryString.length === 2 && (queryString[0] === "lang" || queryString[0] === "language")) {
        loadTutorialForLanguage(queryString[1], callback);
      } else {
        callback("No language key or language value specified.");
      }
    } else {
      callback("No query string.");
    }
  } // end function


  /**
   * Tries to load a tutorial using the local storage's language.
   *
   * @param {Function} callback The only parameter passed is the error, and it will be undefined if the call succeeds.
   */
  function tryLoadTutorialUsingLocalStorage(callback) {
    if (store()) {
      if (localStorage.preferredLanguage) {
        loadTutorialForLanguage(localStorage.preferredLanguage, callback);
      } else {
        callback("No preferred language set.");
      }
    } else {
      callback("Local storage not available.");
    }
  }


  // Check for language in the query string first.
  tryLoadTutorialUsingQueryString(function (queryStringError) {
    if (queryStringError) {
      // If failed to load from query, try loading from local storage.
      tryLoadTutorialUsingLocalStorage(function (localStorageError) {

        if (localStorageError) {
          // If failed to load from local storage, load the default page.
          loadTutorialForLanguage(defaultLanguageCode);
        }
      });
    }
  });

});
