"use strict";

// --------------------------- Directories ---------------------------------- //
var rootDirectory   = __dirname;
var pdbFolderPath   = rootDirectory + "/pdb/";
var matlabPath      = rootDirectory + "/matlab/";
var funcModule      = rootDirectory + "/func.js";
var errorsModule    = rootDirectory + "/errorChecking.js";
var matlabErrorPath = rootDirectory + "/logs/errors/matlab/";
var logErrorPath    = rootDirectory + "/logs/errors/"
var logPath         = rootDirectory + "/logs/";

// ------------------------------- Etc -------------------------------------- //
var pdbExtension  = ".pdb";
var torsExtension = ".tors";
var errorExtension = ".error";
var ownPdbExtension = ".custom";
var nameExtension = ".names";
var transformMetaExtension = "_transform.meta";
var transformedPdbExtension = "_result.pdb";

var matlabPrefix = `cd ${matlabPath} && matlab -nodisplay -nosplash -r "try; `;
var matlabPostfix = "; catch exception; disp('exception'); end; exit;\"";

var passwordSeparator = ":/";
var dbRoleUser = "user";
// --------------------------- Functions ------------------------------------ //

/**
 * Creates a PDB path with required file name.
 *
 * @param fileName Name of the PDB file without extension.
 * @return Full path to the required PDB file.
 */
var getPdbPath = function (fileName) {
  return pdbFolderPath + fileName + pdbExtension;
};

/**
 * Creates a path to the file containing torsion angles.
 *
 * @param fileName Name of the torsion file without extension.
 * @return Full path to the required torsion file.
 */
var getTorsionPath = function (fileName) {
  return pdbFolderPath + fileName + torsExtension;
};

/**
 * Creates a path to the file containing the transform metadata (deltas, etc).
 *
 * @param {String} fileName Name of the metadata file without extension.
 * @return {String} Full path to the required metadata file.
 */
var getTransformMetaPath = function (fileName) {
  return pdbFolderPath + fileName + transformMetaExtension;
}

/**
 * Creates a path to the file containing errors (MATLAB).
 *
 * @param {String} fileName Name of the error file without extension.
 * @return {String} Full path to the required error file.
 */
var getErrorPath = function (fileName) {
  return matlabErrorPath + fileName + errorExtension;
};

/**
 * Creates a path to the file containing molecule's name data.
 *
 * @param {String} fileName Name of the file to write into without extension.
 * @return {String} Full path to the required name file.
 */
var getNamePath = function (fileName) {
  return pdbFolderPath + fileName + nameExtension;
}

/**
 * Creates a path to the file containing transformed structures.
 *
 * @param {String} filename Name of the PDB file without extension.
 * @return {String} Full path to the required PDB file with transformed structures.
 */
var getTransformedPdbPath = function (fileName) {
  return pdbFolderPath + fileName + transformedPdbExtension;
}

/**
 * Creates a path to the file containing own PDB structure.
 *
 * @param {String} fileName Name of the PDB file without extension.
 * @return {String} Full path to the required PDB file with own PDB structure.
 */
var getOwnPdbPath = function (fileName) {
  return pdbFolderPath + fileName + ownPdbExtension;
}

/**
 * Creates a path to the file containing logs.
 *
 * @param {String} fileName Name of the file to add to logs (WITH extension).
 * @return {String} Full path to the required log file.
 */
var getLogPath = function (fileName) {
  return logPath + fileName;
}

/**
 * Creates a path to the file containing erroneous logs.
 *
 * @param {String} fileName Name of the file to add to logs (WITH extension).
 * @return {String} Full path to the required error log file.
 */
var getErrorLogPath = function (fileName) {
  return logErrorPath + fileName;
}

/**
 *
 */
var matlabCommand = function (funcToRun) {
  return matlabPrefix + funcToRun + matlabPostfix;
};

/**
 * Escapes single quotes.
 *
 * @param {String} str String to escape the single quotes in.
 * @return {String} The given string with single quotes escaped.
 */
function escS(str) {
  return str.replace("'", "''");
}

/**
 * Constructs a MATLAB segment cut command from given parameters.
 * Assumes that all of the parameters have valid values, types, and are not escaped (single quotes are escaped
 * automatically by this function).
 *
 * @param {String} proteinCode - Protein code.
 * @param {String} chain - Name of the chain.
 * @param {Number} segmentStart - Start of the segment.
 * @param {Number} segmentEnd - End of the segment.
 * @param {String} pdbPath - Path and name of the PDB file to write into.
 * @param {String} torsPath - Path and the name of the file to write torsion angles into.
 * @param {String} namePath - Path and the name of the file to write name info into.
 */
var matlabSegmentCutCommand = function (proteinCode, chain, segmentStart, segmentEnd, pdbPath, torsPath, errorPath, namePath) {

  // Escape the string parameters.
  proteinCode = escS(proteinCode);
  chain       = escS(chain);
  pdbPath     = escS(pdbPath);
  torsPath    = escS(torsPath);
  errorPath   = escS(errorPath);
  namePath    = escS(namePath);

  // NB! Uses string templates available only since ECMAScript 6.
  var matFunc = `Segment_cut('${proteinCode}', '${chain}', ${segmentStart}, ${segmentEnd},'${pdbPath}', '${torsPath}', '${errorPath}', '${namePath}')`;

  return matlabCommand(matFunc);
};

/**
 * Constructs a MATLAB segment cut command from own PDB file.
 *
 * @param {String} proteinFile Path to the file containing the PDB.
 * @see matlabSegmentCutCommand for more details.
 */
var matlabOwnPdbSegmentCutCommand = function (proteinFile, chain, segmentStart, segmentEnd, pdbPath, torsPath, errorPath) {

  // Escape the string parameters.
  proteinFile = escS(proteinFile);
  chain       = escS(chain);
  pdbPath     = escS(pdbPath);
  torsPath    = escS(torsPath);
  errorPath   = escS(errorPath);

  var matFunc = `Segment_cut_own_pdb('${proteinFile}', '${chain}', ${segmentStart}, ${segmentEnd},'${pdbPath}', '${torsPath}', '${errorPath}')`;
  return matlabCommand(matFunc);
}

/**
 * Constructs a MATLAB segment transform command from given parameters.
 * Assumes that all of the parameters have valid values, types, and are not escaped (single quotes are escaped
 * automatically by this function).
 *
 * @param {String} pdbFile - PDB file to read the segment from.
 * @param {String} pdbOut - PDB file to write the results into.
 * @param {String} tgtPhi - Target phi torsions, formatted for matlab use.
 * @param {String} tgtPsi - Target psi torsions, formatted for matlab use.
 * @param {String} cstPhi - Phi torsions to constrain, formatted for matlab use.
 * @param {String} cstPsi - Psi torsions to constrain, formatted for matlab use.
 * @param {String} errorPath - Path to the error file to write into if something happens.
 * @param {String} metaPath - Path to file to store the metadata in.
 */
var matlabTransformCommand = function (pdbFile, pdbOut, tgtPhi, tgtPsi, cstPhi, cstPsi, errorPath, metaPath) {

  pdbFile   = escS(pdbFile);
  pdbOut    = escS(pdbOut);
  errorPath = escS(errorPath);
  metaPath  = escS(metaPath);

  // NB! Uses string templates available only since ECMAScript 6.
  var matFunc = `Loop_Modeller_Transform('${pdbFile}', '${pdbOut}', ${tgtPhi}, ${tgtPsi}, ${cstPhi}, ${cstPsi}, '${errorPath}', '${metaPath}')`;
  return matlabCommand(matFunc);
};

/**
 * Formats an array of residue-torsion object pairs into their matlab representation.
 *
 * @param {Array} atoms - Array of objects containing "res" and "targetTors" values.
 * @return {String} Array string; formatted for matlab use.
 */
var toTargetTorsionMatlabFormat = function (atoms) {
  // 1. Set the opening squared bracket '['.
  var targetFmt = "[";

  // 2. Add torsions in format res, targetTors; res, targetTors; ...
  for (const atom of atoms) {
    targetFmt += `${atom.res} ${atom.targetTors};`;
  }

  // 3. Finish the string by removing the last superfluous semicolon ';', and adding a closing square bracket ']'
  //    but only if at least something was added to the formatted string.
  if (atoms.length > 0) {
    targetFmt = targetFmt.slice(0, -1) + "]";
  } else {
    targetFmt += "]";
  }

  return targetFmt;
};

/**
 * Formats an array of numbers into their matlab representation.
 *
 * @param {Array} torsions - Array of numbers.
 * @return {String} Array string; formatted for matlab use.
 */
var toNumberArrayMatlabFormat = function (array) {
  // 1. Set the opening squared bracket '[';
  var arrayFmt = "[";

  // 2. Add numbers to the format.
  for (const num of array) {
    arrayFmt += num + " ";
  }

  // 3. Finish the string by adding a closing square bracket ']'.
  return arrayFmt + "]";
}


// ----------------------------- EXPORT ------------------------------------- //
var strings = module.exports = {};

// --------------------------- Directories ---------------------------------- //
strings.rootDirectory = rootDirectory;
strings.pdbFolderPath = pdbFolderPath;
strings.funcModule    = funcModule;
strings.errorsModule  = errorsModule;

// --------------------------- Functions ------------------------------------ //
strings.getPdbPath = getPdbPath;
strings.getTorsionPath = getTorsionPath;
strings.getLogPath = getLogPath;
strings.getNamePath = getNamePath;
strings.getErrorPath = getErrorPath;
strings.getOwnPdbPath = getOwnPdbPath;
strings.getErrorLogPath = getErrorLogPath;
strings.getTransformedPdbPath = getTransformedPdbPath;
strings.getTransformMetaPath = getTransformMetaPath;
strings.matlabSegmentCutCommand = matlabSegmentCutCommand;
strings.matlabOwnPdbSegmentCutCommand = matlabOwnPdbSegmentCutCommand;
strings.matlabTransformCommand = matlabTransformCommand;
strings.toTargetTorsionMatlabFormat = toTargetTorsionMatlabFormat;
strings.toNumberArrayMatlabFormat = toNumberArrayMatlabFormat;

strings.dbRoleUser = dbRoleUser;
strings.passwordSeparator = passwordSeparator;
