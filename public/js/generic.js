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
app.controller("genericController", function ($scope, $http, $timeout) {

  $scope.aVars = {
    transforms: [],
    loading: false,
    lang: _lang
  };

  $scope.func = {
    loadLanguage: loadLanguage,
    loadAvailableLanguages: loadAvailableLanguages,
    loadAllTransforms, loadAllTransforms
  };

  $scope.func.view = {
    showLanguageBox: showLanguageBox,
    hideLanguageBox: hideLanguageBox
  };

  $scope.aVars.view = {
    sharedUrl: null
  };

  var viewVars = {
    showingLanguageBox: false,
    animatingLanguageBox: false
  };

  var apis = {
    getAllSharedTransforms: function () {
      return "/api/getAllSharedTransforms";
    },

    getAvailableLanguages: function () {
      return "/api/getAvailableLanguages";
    },

    getLanguage: function (language) {
      return "/lang/" + language + ".json";
    }
  };


  function toast(text) {
      Materialize.toast(text, 5000);
  }


  function loadAllTransforms() {
    $scope.aVars.loading = true;
    $http.get(apis.getAllSharedTransforms()).then(function (transforms) {
      $scope.aVars.loading = false;
      $scope.aVars.transforms = transforms.data.data;
    }).catch(function (error) {
      // Ignore.
      $scope.aVars.loading = false;
    });
  }



  function showLanguageBox() {
    if (viewVars.showingLanguageBox || viewVars.animatingLanguageBox) return;
    viewVars.animatingLanguageBox = true;

    var container = $("#lang-box-container");
    container.show();
    container.animate({"right": "0"}, 300, function () {
      viewVars.animatingLanguageBox = false;
      viewVars.showingLanguageBox = true;
    });
  }


  function hideLanguageBox() {
    if (!viewVars.showingLanguageBox || viewVars.animatingLanguageBox) return;
    viewVars.animatingLanguageBox = true;

    var container = $("#lang-box-container");
    container.show();
    container.animate({"right": "-40%"}, 300, function () {
      container.hide();
      viewVars.animatingLanguageBox = false;
      viewVars.showingLanguageBox = false;
    });
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
      }

      $timeout(function () {
        $(".tooltipped").tooltip();
      }, 250);

    }, function (error) {
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


  function store() {
    return (typeof (Storage) !== "undefined");
  }

  if (store()) {
    if (localStorage.preferredLanguage) {
        loadLanguage(localStorage.preferredLanguage);
    }
  } else {
    toast($scope.aVars.lang.errLocalStorageUnavailable);
  }
});
