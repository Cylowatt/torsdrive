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


/**
 * These work like enumerations to show which stage is the app at now.
 */
const CONSTS = {
  STAGE: {
    CUTFORM: 0,  // Initial form to choose the cut.
    SEGMENT: 1,  // Segment view with transform form.
    TRANSFORM: 2 // Transform view with animation.
  }
};

/**
 * The vars object contains diffent model-level variables like flags and indices.
 */
var vars = {
  // Indicates whether the side navigation bar is shown.
  showingSideNavbar: false,

  // Indicates whether the side navigation bar is being hidden.
  hidingSideNavbar: false,

  // Indicates whether the side navigation bar which contains the transformation data is being animated.
  animatingTransformNavbar: false,

  // ID of the currently active PDB side navigation bar entry.
  selectedNavbarSegmentId: undefined,

  // Indicates whether the transform details side navigation bar is being animated.
  animatingTransformDetailsNavbar: false,

  // ID of the currently active transform side navigation bar entry.
  selectedNavbarTransformId: undefined,

  // Indicates whether the language box is shown or not.
  showingLanguageBox: false,

  // Indicates whether the language box is being animated or not.
  animatingLanguageBox: false,

  // The current stage shows on which screen is the app running.
  currentStage: CONSTS.STAGE.CUTFORM,

  // Shows whether JSMol object has been loaded.
  jsmolLoaded: false,

  // True if the right bar (with the transform parameters or details) is shown.
  showingRightBar: true,

  // True if the right bar is being animated.
  animatingRightBar: false
};

/**
 * The select object contains selectors for HTML DOM objects.
 */
var select = {

  /**
   * Selects an object and stores/retrieves its reference.
   *
   * @param {Object} object Refence to the object.
   * @param {String} selector JQuery selector for the object (single).
   * @return {Object} Reference to the object.
   */
  object: function (object, selector) {
    if (typeof object === "undefined") {
      object = $(selector);
    }
    return object;
  },

  navbarOverlay: function () {
    return select.object(select.navbarOverlayObject, "#navbar-overlay");
  },

  sidebarContainer: function () {
    return select.object(select.sidebarContainerObject, "#sidebar-container");
  },

  leftNavbar: function () {
    return select.object(select.leftNavbarObject, "#left-navbar");
  },

  transformNavbar: function () {
    return select.object(select.transformNavbarObject, "#transform-navbar");
  },

  transformDetailsNavbar: function () {
    return select.object(select.transformDetailsNavbarObject, "#transform-details-navbar");
  },

  languageBoxContainer: function () {
    return select.object(select.languageBoxContainerObject, "#lang-box-container");
  },

  loadingDiv: function () {
    return select.object(select.loadingDivObject, "#loading-div");
  },

  loadingCard: function () {
    return select.object(select.loadingCardObject, "#loading-card");
  },

  stageProteinCutForm: function () {
    return select.object(select.stageProteinCutFormObject, "#screen-protein-cut-form");
  },

  jsmolContainer: function () {
    return select.object(select.jsmolContainerObject, "#jsmol-container");
  },

  stageJsmol: function () {
    return select.object(select.stageJsmolObject, "#jsmol-view");
  },

  jsmol: function () {
    return select.object(select.jsmolObject, "#jsmol");
  },

  rightBar: function () {
    return select.object(select.rightBarObject, "#movement-entry-form-container");
  },

  navbarCanceller: function () {
    return select.object(select.navbarCancellerObject, "#navbar-canceller");
  },

  formOpenButton: function () {
    return select.object(select.formOpenButtonObject, "#form-open-button");
  },

  torsFormSendButton: function () {
    return select.object(select.torsFormSendButtonObject, "#tors-form-send-button-l");
  },

  animationRange: function () {
    return select.object(select.animationRangeObject, "#animation-range");
  },

  playPauseButton: function () {
    return select.object(select.playPauseButtonObject, "#play-pause-button");
  }
};

/**
 * The view object contains functions for the HTML on click listeners.
 */
var view = {};

/**
 * Shows the leftmost sidebar with PDB file names.
 */
view.showSideNavbar = function (active) {
  // Do not do anything is the sidebar is being hidden.
  if (vars.hidingSideNavbar) return;

  vars.showingSideNavbar = true;

  // Show the overlay and darken its background.
  select.navbarOverlay().show();
  select.navbarOverlay().addClass("dimmedBackground", 300);

  // At the same time, animate the side navigation bar in.
  select.leftNavbar().animate({"left": 0}, 300);
};

/**
 * Hides the whole sidebar.
 */
view.hideSideNavbar = function () {

  // Do not do anything is the sidebar is being hidden.
  // Also set the flag of hiding the sidebar.
  if (vars.hidingSideNavbar) return;
  vars.hidingSideNavbar = true;

  // Animate all of the navigation bars out.
  select.transformDetailsNavbar().animate({"left": "-45%"}, 300);
  select.transformNavbar().animate({"left": "-25%"}, 300);
  select.leftNavbar().animate({"left": "-25%"}, 300);

  // Animate the shade out at the same time.
  select.navbarOverlay().removeClass("dimmedBackground", 300, function () {
    vars.selectedNavbarTransformId = undefined;

    // When the shade has been animated out, hide the overlay and unset the hiding of the sidebar flag.
    select.navbarOverlay().hide();
    vars.showingSideNavbar = false;
    vars.hidingSideNavbar = false;
  });
};

/**
 * Shows the transform sidebar with transforms relating to the provided segment ID.
 *
 * @param {Number} id ID of the segment that has been selected. If the navigation bar is being animated, does nothing.
 */
view.showTransformSideNavbar = function (id) {

  // Ignore the call if the sidebar is still animating.
  if (vars.animatingTransformNavbar) return;

  // If there is a currently selected navbar transform ID, hide it instantly.
  if (vars.selectedNavbarTransformId) {
    select.transformDetailsNavbar().css({"left": "-20%"});
  }

  // Flag the transform navbar as being animated.
  vars.animatingTransformNavbar = true;

  // Set the currently selected segment ID.
  vars.selectedNavbarSegmentId = id;

  // Move the transform bar directly behind the leftmost one, and then animate it in.
  select.transformNavbar().css({"left": 0});
  select.transformNavbar().animate({"left": "25%"}, 300, function () {
    // Unset the animation flag as soon as done animating.
    vars.animatingTransformNavbar = false;
  });
};

/**
 * Shows the details of a transform.
 *
 * @param {Number} id ID of the transform entry that has been selected. If the details navigation bar is being animated,
 *                    does nothing.
 */
view.showTransformDetailsNavbar = function (id) {

  // If currently animating, do nothing.
  if (vars.animatingTransformDetailsNavbar) return;

  // Set animation flag.
  vars.animatingTransformDetailsNavbar = true;

  // Set the current ID in the model.
  vars.selectedNavbarTransformId = id;

  // Move the details bar to needed position and animate it.
  select.transformDetailsNavbar().css({"left": "5%"});
  select.transformDetailsNavbar().animate({"left": "50%"}, 300, function () {
    // Unset the animation flag when done.
    vars.animatingTransformDetailsNavbar = false;
  });
};


/**
 * Stops the event propagation for nested on click listeners.
 */
view.stopHere = function (event) {
  event.stopPropagation();
};

/**
 * Shows the loading div covering the screen.
 */
view.showLoading = function (show) {
  var bgOffset = 500;
  var cardOffset = 300;

  if (show) {
    select.loadingDiv().show();
    select.loadingDiv().animate({"background-color": "rgba(0, 0, 0, 0.9)"}, bgOffset);
    select.loadingCard().animate({"top": "15vh"}, cardOffset);
  } else {
    select.loadingCard().animate({"top": "-20em"}, cardOffset);
    select.loadingDiv().animate({"background-color": "rgba(0, 0, 0, 0.0)"}, bgOffset, function () {
      select.loadingDiv().hide();
    });
  }
};

/**
 * Shows the language box.
 */
view.showLanguageBox = function () {
  if (vars.showingLanguageBox || vars.animatingLanguageBox) return;
  vars.animatingLanguageBox = true;

  var container = select.languageBoxContainer();
  container.show();
  container.animate({"right": "0"}, 300, function () {
    vars.animatingLanguageBox = false;
    vars.showingLanguageBox = true;
  });
};


view.hideLanguageBox = function () {
  if (!vars.showingLanguageBox || vars.animatingLanguageBox) return;
  vars.animatingLanguageBox = true;

  var container = select.languageBoxContainer();
  container.animate({"right": "-40%"}, 300, function () {
    container.hide();
    vars.showingLanguageBox = false;
    vars.animatingLanguageBox = false;
  });
};

/**
 * Initialises JSMol if it has not been initialised yet. If it has been initialised, simply loads the data from the URL.
 *
 * @param {String} url URL to load, pointing to PDB data. In form '/getPdb...': without the host.
 */
view.initJsmol = function (url) {

  if (!vars.jsmolLoaded) {
    // JSMol init info.
    var info = {
      color: "#CECECE",                // Background colour.
      height: "100%",                  // Size of the object.
      width: "100%",
      use: "HTML5",
      j2sPath: "js/jsmol/j2s",         // JSMol functions path.
      src: url,                        // Source of the model.
      serverURL: window.location.host, // Current URL.
      disableInitialConsole: true
    };

    // Initialise JSMol.
    select.jsmol().html(Jmol.getAppletHtml("jsmolApp", info));
    vars.jsmolLoaded = true;
  } else {
    Jmol.script(jsmolApp, "load '" + url + "'");
  }
};


/**
 * Moves the view to the cut form stage (where the user initially chooses a segment).
 *
 * @param {Function} callback Callback function to call when the move is done.
 */
view.goToCutFormStage = function (callback) {
  var offset = 300;

  // This is a back move: fade the JSMol stage out, and fade the protein cut form in.
  if (vars.currentStage === CONSTS.STAGE.SEGMENT || vars.currentStage === CONSTS.STAGE.TRANSFORM) {
    select.stageJsmol().fadeOut(offset, function () {
      select.stageProteinCutForm().fadeIn(offset);
      vars.currentStage = CONSTS.STAGE.CUTFORM;
      if (callback) callback();
    });
  }
};

/**
 * Fades out the current stage and fade in the segment preview one.
 *
 * @param {String} pdbUrl URL pointing at the PDB data.
 * @param {Function} callback Function to execute after all of the operations are done. Note that JSMol might still be
 *                            in the middle of initialisation.
 */
view.goToSegmentStage = function (pdbUrl, callback, justTransition) {
  var offset = 300;

  if (!justTransition) {
    view.initJsmol(pdbUrl);
  }

  if (vars.currentStage === CONSTS.STAGE.CUTFORM) {
    select.stageProteinCutForm().fadeOut(offset, function () {
      select.stageJsmol().fadeIn(offset);

      vars.currentStage = CONSTS.STAGE.SEGMENT;
      Jmol.script(jsmolApp, "refresh");
      if (callback) callback();
    });
  } else if (vars.currentStage === CONSTS.STAGE.TRANSFORM) {
    // Hide the animation controls.
    select.playPauseButton().fadeOut(offset);
    select.animationRange().fadeOut(offset);

    vars.currentStage = CONSTS.STAGE.SEGMENT;
    if (callback) callback();
  }
};

/**
 * @param {String} pdb PDB model to animate.
 * @param {Function} callback Function to execute after all of the operations are done. Note that JSMol might still be
 *                            in the middle of initialisation.
 */
view.goToTransformStage = function (pdb, callback, justTransition) {
  var offset = 300;
  view.showTorsionFormSendButton(false);

  if (vars.currentStage === CONSTS.STAGE.CUTFORM) {
    if (!justTransition) {
      view.initJsmol(null);
      setTimeout( function () {
        // Load the PDB data in.
        jsmolApp.__loadModel(pdb);

        Jmol.script(jsmolApp, `
          anim mode once;
          anim mode palindrome;
          anim fps 50;
          frame 1;
          anim on;`);
      }, 500);
    }

    select.stageProteinCutForm().fadeOut(offset, function () {
      select.stageJsmol().fadeIn(offset);

      // Show the animation controls.
      select.playPauseButton().fadeIn(offset);
      select.animationRange().fadeIn(offset);

      vars.currentStage = CONSTS.STAGE.TRANSFORM;
      if (vars.jsmolLoaded) {
        Jmol.script(jsmolApp, "refresh");
      }
      if (callback) callback();
    });
  } else if (vars.currentStage === CONSTS.STAGE.SEGMENT) {
    if (!justTransition) {
      // Load the PDB data in.
      jsmolApp.__loadModel(pdb);

      // Move the right bar out of the way.
      //select.formOpenButton().click();
    }

    // Show the animation controls.
    select.playPauseButton().fadeIn(offset);
    select.animationRange().fadeIn(offset);

    setTimeout( function () {
      // Start the animation.
      Jmol.script(jsmolApp, `
        anim mode once;
        anim mode palindrome;
        anim fps 50;
        frame 1;
        anim on;`);
    }, 500);

    vars.currentStage = CONSTS.STAGE.TRANSFORM;
    if (callback) callback();
  }
};

view.showTorsionFormSendButton = function (show) {
  if (show) {
    select.torsFormSendButton().show();
  } else {
    select.torsFormSendButton().hide();
  }
}

view.setStage = function (stage) {
  vars.currentStage = stage;
}

/**
 * Toggles the right bar with the phi/psi form.
 */
view.toggleRightBar = function () {

  // Do nothing if the right bar is being animated.
  if (vars.animatingRightBar) return;

  // Declare the duration and set the flag that the right bar is being animated.
  var duration = 300;
  vars.animatingRightBar = true;

  // If the right bar is to be shown.
  if (!vars.showingRightBar) {

    // Show the right bar, and switch classes in order to animate the transition.
    select.rightBar().css({"display": "block"});
    select.rightBar().switchClass("s0", "s6", duration);
    select.jsmolContainer().switchClass("s12", "s6", duration);

    // Show the torsion form send button only if the current stage is the segment stage.
    view.showTorsionFormSendButton (vars.currentStage === CONSTS.STAGE.SEGMENT);

    // Refresh the Jmol object and reset the flags after a timeout.
    setTimeout( function () {
      vars.animatingRightBar = false;
      vars.showingRightBar = true;
      Jmol.script(jsmolApp, "refresh");
    }, duration);

  } else {

    // Hide the right bar at the same time as you increase the size of the JSMol container.
    select.rightBar().switchClass("s6", "s0", duration, function () {
      select.rightBar().css({"display": "none"});
    });
    select.jsmolContainer().switchClass("s6", "s12", duration);

    // Hide the submit button if on segment stage.
    if (vars.currentStage === CONSTS.STAGE.SEGMENT) {
      select.torsFormSendButton().hide();
    }

    // Refresh the Jmol object and reset the flags after a timeout.
    setTimeout( function () {
      vars.animatingRightBar = false;
      vars.showingRightBar = false;
      Jmol.script(jsmolApp, "refresh");
    }, duration);
  } // end if
};

/**
 *
 */
view.downloadUri = function (uri, name) {
  var link = document.createElement("a");
  link.href = uri;
  link.download = name;
  link.click();
};

$(document).ready(function () {
  $(".modal").modal();
});
