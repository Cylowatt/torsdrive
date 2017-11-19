"use strict";

var fs = require("fs");
var strings = require("./strings.js");

/**
 * Checks if an object is undefined or null.
 *
 * @param {Object} object - Object to test.
 * @return {boolean} True if the object is null or undefined, and false if it is neither.
 */
var isUndefined = function (object) {
  return (typeof object === "undefined") || (object === null);
};

/**
 * Checks whether an object is of the given type string.
 * For example, call ("this is a string", "string") will succeed, while call (1234, "string") will fail.
 *
 * @param {string} typeString - Type of the object to check.
 * @param {any} object - Object to test.
 * @return {boolean} True if the object is of the provided type, and otherwise false. If the object is null or
 *                   undefined, also returns false.
 */
var isType = function (typeString, object) {
  return !isUndefined(object) && (typeof object === typeString);
};

/**
 * Checks whether an object is a Symbol or not.
 *
 * @param {Object} object - Object to test.
 * @return {boolean} True if the object is a Symbol, and is not undefined or null.
 */
var isSymbol = function(object) {
  return isType("symbol", object);
};

/**
 * Checks whether an object is a Function or not.
 *
 * @param {Object} object - Object to test.
 * @return {boolean} True if the object is a Function, and is not undefined or null.
 */
var isFunction = function (object) {
  return isType("function", object);
};

/**
 * Checks whether an object is a Boolean or not.
 *
 * @param {Object} object - Object to test.
 * @return {boolean} True if the object is a Boolean, and is not undefined or null.
 */
var isBoolean = function (object) {
  return isType("boolean", object);
};

/**
 * Checks whether an object is an Number or not.
 * Note that NaN is not a number.
 *
 * @param {Object} object - Object to test.
 * @return {boolean} True if the object is a Number, and is not undefined, null or NaN.
 */
var isNumber = function (object) {
  return !isNaN(object) && (object !== NaN);
};

/**
 * Checks whether an object is an Object or not.
 *
 * @param {Object} object - Object to test.
 * @return {boolean} True if the object is an Object, and is not undefined or null.
 */
var isObject = function (object) {
  return isType("object", object);
};

/**
 * Checks whether an object is an Array or not.
 *
 * @param {Array} object - Object to test.
 * @return {boolean} True if the object is an Array, and is not undefined or null.
 */
var isArray = function (object) {
  return isObject(object) && object instanceof Array;
};

/**
 * Checks whether an object is an Array of numbers or not.
 *
 * @param {Array} object - Object to test.
 * @return {boolean} True if the object is an Array of numbers, and is not undefined or null.
 */
var isNumberArray = function (object) {
  if (!isArray(object)) {
    return false;
  }

  for (const num of object) {
    if (!isNumber(num)) {
      return false;
    }
  }

  return true;
};

/**
 * Checks whether an object is an Array of positive integers or not. 0 is not considered a positive integer.
 *
 * @param {Array} object - Object to test.
 * @return {boolean} True if the object is an Array of positive integers, and is not undefined or null.
 */
var isPositiveIntegerArray = function (object) {
  if (!isArray(object)) {
    return false;
  }

  for (const num of object) {
    if (!isPositiveInteger(num)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether an object is a String or not.
 *
 * @param {Object} object - Object to test.
 * @return {boolean} True if the object is a String, and is not undefined or null.
 */
var isString = function (object) {
  return isType("string", object);
};


/**
 * Checks whether an object is an empty string or not.
 *
 * @param {Object} object - Object to test.
 * @return {boolean} True if the object is not a String instance, is an empty string or is undefined or null.
 */
var isEmptyString = function (object) {
  // If not a string or null, consider empty.
  // Also if has no characters, it is empty.
  // If is a string with characters, it is not empty.
  return !isString(object) || (object.length) === 0;
};

/**
 * Checks if the provided object is an even number.
 *
 * @param {Number} num - Object to check.
 * @return {boolean} True if the object is a number, and is even, and false otherwise. 0 is considered even.
 *                   Negative numbers also accepted, with -50 being even, and -25 odd, for exaple.
 */
var isEven = function (num) {
  return isNumber(num) && ((Math.abs(num) % 2) === 0);
};

/**
 * Checks if the provided object is a positive integer. 0 is not considered a positive integer.
 * See: http://stackoverflow.com/a/10835227
 *
 * @param {Number} num - Object to check.
 * @return {boolean} True if the object is a positive integer, and false otherwise.
 */
var isPositiveInteger = function (num) {
  return 0 === num % (!isNaN(parseFloat(num)) && 0 <= ~~num) && num > 0;
}

/**
 * Checks whether two numbers are both positive numbers, and that the start number is smaller than the end number.
 * Zero is not considered a positive number.
 *
 * @param {Number} start - Starting number of the range.
 * @param {Number} end - Ending number of the range.
 * @return True if the two numbers are positive numbers, and the start is smaller than the end.
 */
var isNumRange = function (start, end) {
  return isNumber(start) && isNumber(end) && start >= 1 && start < end;
};

/**
 * Creates a random string of given length.
 * http://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
 *
 * @param {Number} length - The length of the random string. Assumed to be a positive integer.
 * @return A random string of specified length (alphanumeric ASCII characters).
 */
var randomString = function (length) {
  // All alphanumeric ASCII characters.
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var random = [];

  var i = 0;
  for (i; i < length; i++) {
    // Get a character at random number in the character string, and append it
    // to the random string to return.
    random.push(chars.charAt(Math.floor(Math.random() * chars.length)));
  }

  // Join the characters together without a separator.
  return random.join("");
};

/**
 * Determines whether a provided target torsion angles object is in correct format.
 * The format is:
 * [ {"res": residue_number, "targetTors": phi_target}, { ... }, { ... } ]
 * where residue_number is a positive integer, and phi_target is a number.
 *
 * @param {Array} torsions - Array of torsion angles in format described above.
 * @return {boolean} True if the object is in correc format, and false if not.
 */
var correctTargetTorsionsFormat = function (torsions) {
  if (!isArray(torsions)) {
    return false;
  }

  // Go through every object and see whether it contains "res" and "targetTors" values, which must be a positive integer
  // and a number respectively.
  var len = torsions.length;
  var i = 0;
  for (i = 0; i < len; i++) {
    if (!isPositiveInteger(torsions[i].res)) {
      return false;
    } else if (!isNumber(torsions[i].targetTors)) {
      return false;
    }
  }

  return true;
}


const LOGMODE = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

/**
 * Server-wide logging facility.
 *
 * @param {Object} message Object or string to log.
 * @param {Mode} mode Log mode.
 */
var log = function (message, mode) {

  var file;

  if (isObject(message)) {
    message = JSON.stringify(message) + "\n";
  }

  switch (mode) {
    case LOGMODE.DEBUG:
      message = `[${LOGMODE.DEBUG}] DEBUG: ${message}\n`;
      file = strings.getLogPath("log.log");
      break;
    case LOGMODE.INFO:
      message = `[${LOGMODE.INFO}] INFO: ${message}\n`;
      file = strings.getLogPath("log.log");
      break;
    case LOGMODE.WARN:
      message = `[${LOGMODE.WARN}] WARN: ${message}\n`;
      file = strings.getLogPath("log.log");
      break;
    case LOGMODE.ERROR:
      message = `[${LOGMODE.ERROR}] ERROR: ${message}\n`;
      file = strings.getLogPath("error.log");
      break;
    default:
      file = strings.getLogPath("log.log");
      break;
  }

  console.log(message);
  fs.appendFile(file, message, (err) => {});
}

var logBody = function (req, res, next) {
  log(JSON.stringify(req), LOGMODE.INFO);
  next();
}

// Export the functions.
var func = module.exports = {};

func.isUndefined   = isUndefined;
func.isSymbol      = isSymbol;
func.isFunction    = isFunction;
func.isBoolean     = isBoolean;
func.isNumber      = isNumber;
func.isObject      = isObject;
func.isString      = isString;

func.isEven        = isEven;
func.isNumRange    = isNumRange;
func.isEmptyString = isEmptyString;
func.randomString  = randomString;

func.isArray                = isArray;
func.isNumberArray          = isNumberArray;
func.isPositiveIntegerArray = isPositiveIntegerArray;

func.correctTargetTorsionsFormat = correctTargetTorsionsFormat;

func.log     = log;
func.logBody = logBody;
func.LOGMODE = LOGMODE;
