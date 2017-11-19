"use strict";

// https://chemapps.stolaf.edu/jmol/docs/examples/animation.htm
// https://chemapps.stolaf.edu/jmol/docs/?ver=14.6
// http://wiki.jmol.org/index.php/Jmol_JavaScript_Object
// http://wiki.jmol.org/index.php/JSmol
// https://sourceforge.net/projects/jsmol/

var express = require("express");
var fs      = require("fs");
var exec    = require("child_process").exec;

var router  = express.Router();

var strings = require("../strings.js");
var func    = require(strings.funcModule);

module.exports = function (auth, Role, User, Segment, Transform, sequelize) {

  router.get("/", function (req, res) {
    res.render("home", {title: "Main"});
  });

  router.get("/tutorial", function (req ,res) {
    res.render("tutorial", {title: "Tutorial"});
  });

  router.get("/admin", function (req, res) {
  //  if (!req.user) {
  //      res.render("error", {message: "NOPE", error: {status: "404", stack: ""}});
  //  }

    res.render("admin", {title: "Admin"}); // TODO log in page for admins exclusively; admin APIs
  });


  router.get("/tool", function (req, res) {
    res.render("tool", {title: "UEA Torsion Driving Tool"});
  });

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
   * If ownPdbObject is present and is in correct format, returns a callback with correct MATLAB command.
   * If ownPdbObject is present but not in correct format, sends an error back and makes no callbacks.
   * If ownPdbObject is absent, and pdb code is present, returns a callback with correct MATLAB command.
   *
   * @param {Object} res Express' reponse object.
   * @param {String} id ID of the future segment.
   * @param {String} pdbCode PDB code of the protein. Might be missing if ownPdbObject is given.
   * @param {String} ownPdbObject Text of a PDB file to check and create a command from.
   * @param {Object} params Object containing the needed parameters for creating the MATLAB command: {
   *    "chain":    {String} Name of the chain
   *    "start":    {Number} Starting position
   *    "end":      {Number} Ending position
   *    "outPath":  {String} Path to file to output the segment into.
   *    "torsPath": {String} Path to file to output segment torsions into.
   *    "errPath":  {String} Path to file to output errors into.
   *    "namePath": {String} Path to file to write the name data into.
   *   }
   * @callback {Function} Returns an appropriate MATLAB command to run. Will have a second parameter for input file name
   *                      in case it was own PDB file which needs to be deleted.
   */
  function selectPdbToCut(res, id, pdbCode, ownPdbObject, params, callback) {
    var cmd;
    if (func.isUndefined(ownPdbObject)) {
      if (func.isEmptyString(pdbCode)) {
        func.log("No PDB code for segment " + id);

        // No PDB code or PDB file.
        return res.status(400).json(withCode(200));
      }

      cmd = strings.matlabSegmentCutCommand(pdbCode, params.chain, params.start, params.end, params.outPath, params.torsPath, params.errPath, params.namePath);
      callback(cmd, null);

    } else {
      if (correctPdbFormat(ownPdbObject)) {
        var ownPath = strings.getOwnPdbPath(id);
        fs.writeFile(ownPath, ownPdbObject, function (error) {
          if (error) {
            func.log(JSON.stringify(error));

            // Could not write file; server error.
            return res.status(500).json(withCode(0));
          }

          cmd = strings.matlabOwnPdbSegmentCutCommand(ownPath, params.chain, params.start, params.end, params.outPath, params.torsPath, params.errPath);
          callback(cmd, ownPath);
        });
      } else {
        func.log("Wrong PDB file format " + ownPdbObject);

        // Wrong PDB file format.
        return res.status(400).json(withCode(209));
      }
    }
  }


  /**
   * Checks whether a PDB string's format is correct.
   *
   * @param {String} pdb PDB string to check.
   * @return {Boolean} True if the format is correct, and false if it is not.
   */
  function correctPdbFormat(pdb) {

    // Split into lines.
    var lines = pdb.toString().split("\n");
    var atomCount = 0;
    var line;

    var i = 0;
    var len = lines.length;
    for (i; i < len; i++) {
      // Split by whitespace.
      line = lines[i].trim().split(/\s+/);

      // Skip all of the non-atom entries.
      if (line[0] !== "ATOM") continue;
      atomCount++;

      // Must have 12 columns.
      if (line.length !== 12) return false;

      // The second column must be a number.
      if (!func.isNumber(line[1])) return false;

      // The fourth column is no longer than 3 characters.
      if (line[3].length > 3) return false;

      // Columns 6-11 must be numbers.
      if (!func.isNumber(line[5])  || !func.isNumber(line[6]) ||
          !func.isNumber(line[7])  || !func.isNumber(line[8]) ||
          !func.isNumber(line[9])  || !func.isNumber(line[10])) {
            return false;
      }
    }

    return atomCount > 0;
  }


  function parseName(fileBuffer) {
    try {
      var lines = fileBuffer.toString().split("\n");

      var i = 0;
      var len = lines.length;
      var line;
      for (i = 0; i < len; i++) {
        line = lines[i].trim();
        if (line.startsWith("TITLE")) {
          line = line.split(":")[1];
          return line.slice(0, -1).trim();
        }
      }
    } catch (err) {
      func.log(err);
      return "";
    }
  }


  /**
   * POST "/api/databasePdb"
   * Used to access a protein structure's cut from the Protein Databank or from a custom file.
   *
   * @param {Object} JSON:
   *   @param {String} name - Name of the segment.
   *   @param {String} pdbCode - Protein code in the PDB. For example, '1adg'.
   *   @param {String} chain - Name of the chain to retrieve.
   *   @param {Number} start - Starting position of the chain segment.
   *   @param {Number} end - Ending position of the chain segment.
   *   @param {String} owbPdbObject - String containing data of own PDB file. If provided, pdbCode will be ignored.
   *
   * @return JSON with the name of the files to access the segment data from.
   *         JSON: {pdb: "segmentId"}. TODO log all reqs.
   */
  router.post("/api/databasePdb", function (req, res) {
    var body = req.body;

    // Error check: missing data.
    // HTTP code of 400 stands for Bad Request.
    if (func.isEmptyString(body.pdbCode) && func.isEmptyString(body.ownPdbObject)) {
      // No PDB code or own PDB file provided.
      return res.status(400).json(withCode(200));

    } else if (func.isEmptyString(body.chain)) {
      // No chain name provided.
      return res.status(400).json(withCode(201));

    } else if (!func.isNumRange(body.start, body.end)) {
      // Start and end of a segment must be positive integers with start being a smaller number than the end.
      return res.status(400).json(withCode(202));
    }

    // If name is defined and is a non-empty string, set it to given value.
    // Otherwise set to null.
    var name = body.name;
    if (func.isString(name) && name.trim().length > 0) {
      name = name.trim();
    } else {
      name = null;
    }

    var pdbCode = undefined;
    if (func.isString(body.pdbCode)) {
      pdbCode = body.pdbCode.trim();
    }

    var chain        = body.chain.trim();
    var start        = body.start;
    var end          = body.end;
    var ownPdbObject = body.ownPdbObject;
    var shared       = true;

    if (!func.isUndefined(ownPdbObject)) {
      shared = false;
    }

    // Generate a random segment ID.
    // Collisions should not happen because of the timestamp.
    var segmentId = Date.now() + func.randomString(16);

    // Generate the torsion, PDB and error file paths.
    var pdbFile   = strings.getPdbPath(segmentId);
    var torsFile  = strings.getTorsionPath(segmentId);
    var errorFile = strings.getErrorPath(segmentId);
    var nameFile  = strings.getNamePath(segmentId);

    // Select which PDB to cut.
    var params = {
         chain: chain,
         start: start,
           end: end,
       outPath: pdbFile,
      torsPath: torsFile,
       errPath: errorFile,
      namePath: nameFile
    };

    selectPdbToCut(res, segmentId, pdbCode, ownPdbObject, params, function (cmd, inputPath) {

      // Call the command to save the data in the file.
      exec(cmd, function (error) {
        // Remove the temporary file.
        if (!func.isUndefined(inputPath)) {
          fs.unlinkSync(inputPath);
        }

        if (error) {
          // On execution error.
          func.log(error);

          // Generic server error.
          return res.status(500).json(withCode(0)); // 0

        } else if (fs.existsSync(errorFile)){
          return fs.readFile(errorFile, function (errorFileError, errorCode) {
            func.log(`MATLAB error ${errorCode}`);

            // Just pass the MATLAB error code.
            return res.status(500).json(withCode(errorCode));
          });
        } else if (!fs.existsSync(pdbFile)) {
          // If the PDB file was not created, log the error and end the request.
          func.log(`Failed to save ${pdbFile}`);

          // Generic server error.
          return res.status(500).json(withCode(0));

        } else if (!fs.existsSync(torsFile)) {
          // If the torsion file was not created, log the error and end the request.
          func.log(`Failed to save ${torsFile}`);

          // Generic server error.
          return res.status(500).json(withCode(0));
        } else if (!name && !fs.existsSync(nameFile)) {
          // If the name file was not created, log the error and end the request.
          func.log(`Failed to save ${nameFile}`);

          // Generic server error.
          return res.status(500).json(withCode(0));
        }

        // Read the contents of the torsion file.
        fs.readFile(torsFile, function (torsError, torsData) {
          if (torsError) {
            // On error, log the error and end the request.
            func.log(torsError);
            // Generic server error.
            return res.status(500).json(withCode(0));

          } else if (func.isUndefined(torsData)) {
            func.log(`Failed to access torsion file ${torsFile}`);
            // Generic server error.
            return res.status(500).json(withCode(0));
          }

          // Read the contents of the PDB segment file.
          fs.readFile(pdbFile, function (pdbError, pdbData) {
            if (pdbError) {
              // On error, log the error and end the request.
              func.log(pdbError);
              // Generic server error.
              return res.status(500).json(withCode(0));

            } else if (func.isUndefined(pdbData)) {
              func.log(`Failed to access PDB file ${pdbFile}`);
              // Generic server error.
              return res.status(500).json(withCode(0));
            }


            if (!name && fs.existsSync(nameFile)) {
              name = fs.readFileSync(nameFile);
            } else if (!name && !func.isUndefined(ownPdbObject)) {
              name = parseName(pdbData);
            } if (!pdbCode) {
                pdbCode = null;
            }

            // Save the results in the database.
            Segment.create({
              id:       segmentId,
              pdb_name: pdbCode,
              shared:   shared,
              name:     name,
              chain:    chain,
              start:    start,
              end:      end,
              pdb:      pdbData,
              owner:    req.user ? req.user.id : null,
              torsions: JSON.stringify(extractTorsions(torsData.toString().trim(), start))
            }).then(function () {
              // Remove the extraneous files.
              fs.unlinkSync(torsFile);
              fs.unlinkSync(pdbFile);
              if (fs.existsSync(nameFile)) {
                fs.unlinkSync(nameFile);
              }

              // On success, send the name of the PDB to the client to access it.
              var result = jsonWithCode(10);
              result.pdb = segmentId;
              result.name = name ? name.toString() : null;
              return res.status(200).json(result);
            }).catch(function (error) {
              func.log("Failed to save to database: " + JSON.stringify(error));
              // Generic server error.
              return res.status(500).json(withCode(0));
            });
          });
        });
      });
    });
  }); // end POST "/api/databasePdb"


  /**
   * GET "/api/getPdb?pdb=pdb_id&pdbtype=type"
   * Used to access PDB segments or transforms.
   * The 'pdb' bit of the query is ought to represent the ID of the segment or transform to retrieve.
   * The type might be 'segment' or 'transform' accordingly. Defaults to 'segment'.
   *
   * @return Contents of the requested PDB.
   */
  router.get("/api/getPdb", function (req, res) {
    var pdbId = req.query.pdb;
    var typeTransform = (req.query.pdbtype === "transform");

    // Error check: missing data.
    // HTTP code of 400 stands for Bad Request.
    if (func.isEmptyString(pdbId)) {
      // No transform ID provided OR no segment ID provided.
      return res.status(400).json(withCode(typeTransform ? 204 : 203));
    }

    // Use appropriate database object based on the query.
    var dbObject = Segment;
    if (typeTransform) {
      dbObject = Transform;
    }

    // Get the object by ID.
    dbObject.findOne({
      where: { id: pdbId }
    }).then(function (data) {
      if (func.isUndefined(data)) {
        // Transform or segment with this ID does not exist.
        return res.status(404).json(withCode(typeTransform ? 206 : 205));
      }
      // On success, return its PDB value.
      return res.status(200).send(data.pdb);
    }).catch(function () {
      // On failure, send error..
      return res.status(500).json(withCode(0));
    });
  }); // end GET "/getPdb?pdb=pdbname"


  /**
   * GET "/api/getPdbMeta?pdb=pdb_id&pdbtype=type"
   * Gives access to the PDB metadata.
   * The 'pdb' bit of the query is ought to represent the ID of the segment or transform metadata of which to retrieve.
   * The type might be 'segment' or 'transform' accordingly. Defaults to 'segment'.
   *
   * @return (in case of segment): JSON: {
   *   pdbCode:  {String} Name of the PDB file, if available.
   *   name:     {String} User-given name, if available.
   *   chain:    {String} Chain name.
   *   start:    {Number} Segment start.
   *   end:      {Number} Segment end.
   * }
   *
   * @return (in case of transform): JSON {
   *   name:    {String} User-given name, if available.
   *   segment: {String} ID of the segment the transform was generated from.
   *   transformMeta: [{"num": index_of_backbone_atom,
   *      "type": "phi/psi",
   *      "resultTorsion": resulting_torsion_value,
   *      "requestedTorsion": requested_torsion_value,
   *      "deviation": delta_of_values},
   *      ...
   *      ]
   * }
   */
  router.get("/api/getPdbMeta", function (req, res) {
    var pdbId = req.query.pdb;

    // Error check: missing data.
    // HTTP code of 400 stands for Bad Request.
    if (func.isEmptyString(pdbId)) {
      // No segment ID provided.
      return res.status(400).json(withCode(203));
    }

    // Use appropriate database object based on the query.
    if (req.query.pdbtype === "transform") {

      // Retrieve the transform by ID.
      Transform.findOne({
        where: { id: pdbId }
      }).then(function (transform) {
        if (func.isUndefined(transform)) {
          // No such transform exists.
          return res.status(404).json(withCode(206));
        }

        // Construct the resulting JSON.
        var result           = jsonWithCode(10);
        result.name          = transform.name;
        result.segment       = transform.segment_id;
        result.transformMeta = JSON.parse(transform.meta).transformMeta;

        // On success, send JSON back.
        return res.status(200).json(result);
      }).catch(function () {
        // Generic server error.
        return res.status(500).json(withCode(0));
      });

    } else {

      // Retrieve the segment by ID.
      Segment.findOne({
        where: { id: pdbId }
      }).then(function (segment) {
        if (func.isUndefined(segment)) {
          // No such segment exists.
          return res.status(404).json(withCode(205));
        }

        // On success, construct the resulting JSON.
        var result   = jsonWithCode(10);
        result.code  = segment.pdb_name;
        result.name  = segment.name;
        result.chain = segment.chain;
        result.start = segment.start;
        result.end   = segment.end

        // Send the result back.
        return res.status(200).json(result);
      }).catch(function () {
        // Generic server error;
        return res.status(500).json(withCode(0));
      });
    } // end if
  });


  /**
   * GET "/api/getTorsions?tors=torsname"
   * Used to access a protein cut's initial torsion phi and psi angles.
   * Might send only a phi OR a psi angle for a single torsion.
   *
   * @return JSON {
   * tors: [ { "num": index_of_backbone_atom, "type": "phi"/"psi", "value": value },
   *         { "num": index_of_backbone_atom, "type": "phi"/"psi", "value": value },
   *          ... ],
   * shared: (Boolean)
   * }
   */
  router.get("/api/getTorsions", function (req, res) {
    var torsName = req.query.tors;

    // Error check: missing data.
    // HTTP code of 400 stands for Bad Request.
    if (func.isEmptyString(torsName)) {
      // No segment ID provided.
      return res.status(400).json(withCode(203));
    }

    // Retrieve the segment by ID.
    Segment.findOne({
      where: { id: torsName }
    }).then(function (segment) {
      if (func.isUndefined(segment)) {
        // No such segment exists.
        return res.status(404).json(withCode(205));
      }

      // Create the resulting parsed torsions.
      var result  = jsonWithCode(10);
      result.tors = JSON.parse(segment.torsions).tors;
      result.shared = segment.shared;

      // Return them to user.
      return res.status(200).json(result);
    }).catch(function () {
      // On failure, send back an error message.
      return res.status(500).json(withCode(0));
    });
  }); // end GET "/api/getTorsions?pdb=pdbname"


  /**
   * Extracts the torsions from a set of newline-separated lines.
   *
   * @param {String} torsData Torsion data as a newline-separated string.
   * @param {Number} segmentStart (optional) Index of the start segment.
   * @return JSON {
   * tors: [ { "num": index_of_backbone_atom, "type": "phi/psi", "value": value },
   *         { "num": index_of_backbone_atom, "type": "phi/psi", "value": value },
   *          ... ]
   */
  function extractTorsions(torsData, segmentStart) {
    // Split the file contents into lines.
    // TODO works only on UNIX, Windows would need '\r\n', not just '\n'.
    var tors = torsData.toString().split("\n");

    // Get the amount of lines in the file.
    var lines = tors.length;

    // Construct the initial skeleton of the torsion JSON to return.
    var torsJson = { "tors": [] };

    var offset = func.isUndefined(segmentStart) ? 0 : segmentStart;
    var i = 0;

    // Go through each line.
    for (i; i < lines; i++) {
      if (func.isEmptyString(tors[i])) {
        continue;
      }

      if (func.isEven(i)) {
        // On even number add psi angle (starts from 0, zero is even).
        torsJson.tors.push({
          "num": Math.ceil(i/2) + offset,
          "type": "psi",
          "value": tors[i]
        });
      } else {
        // On odd number add the phi angle.
        torsJson.tors.push({
          "num": Math.ceil(i/2) + offset,
          "type": "phi",
          "value": tors[i]
        });
      } // end if
    } // end for

    return torsJson;
  }

  /**
   * Parses the metadata file into a JSON.
   *
   * @param {String} meta Metadata columns from a meta file.
   * @param {Number} segmentStart Starting index of the segment.
   * @return {Object} JSON {
   *     "transformMeta": [{"num": index_of_backbone_atom,
   *      "type": "phi/psi",
   *      "resultTorsion": resulting_torsion_value,
   *      "requestedTorsion": requested_torsion_value,
   *      "deviation": delta_of_values},
   *      ...
   *      ]
   * }
   */
  function parseMetadata(meta, segmentStart) {
    // Split the file contents into lines.
    // TODO works only on UNIX, Windows would need '\r\n', not just '\n'.
    var metaLines = meta.toString().split("\n");

    // Get the amount of lines in the file.
    var lines = metaLines.length;

    // Construct the initial skeleton of the metadata to return.
    var result = {"transformMeta": []};

    // Calculate the offset.
    var offset = func.isUndefined(segmentStart) ? 0 : segmentStart;
    var i = 0;
    var lineValues;

    // Go through each line.
    for (i; i < lines; i++) {
      if (func.isEmptyString(metaLines[i])) {
        continue;
      }

      // These are tab-separated values, where
      // 0 - initial torsion value (ignored).
      // 1 - resulting torsion value.
      // 2 - originally requested torsion value.
      // 3 - difference between the originally requested and resulting torsion values.
      lineValues = metaLines[i].trim().split(/\s+/);

      if (func.isEven(i)) {
        // On even number add psi torsion (starts from 0, zero is even).
        result.transformMeta.push({
          "num": Math.ceil(i/2) + offset,
          "type": "psi",
          "resultTorsion": lineValues[1],
          "requestedTorsion": lineValues[2],
          "deviation": lineValues[3]
        });
      } else {
        // On odd number add the phi torsion.
        result.transformMeta.push({
          "num": Math.ceil(i/2) + offset,
          "type": "phi",
          "resultTorsion": lineValues[1],
          "requestedTorsion": lineValues[2],
          "deviation": lineValues[3]
        });
      } // end if
    } // end for

    return result;
  }


  /**
   * POST "/api/transformPdb"
   * Used to transform an already stored PDB file with protein fragment.
   *
   * @param {Object} JSON {
   *   "pdbName": "id_of_segment",
   *   "targetPhi": [ {"res": residue_number, "targetTors": phi_target}, { ... }},
   *   "targetPsi": [ {"res": residue_number, "targetTors": psi_target}, { ... }},
   *   "constrPsi": [ residue_number, residue_number2, ... ],
   *   "constrPhi": [ residue_number, residue_number2, ... ],
   *   "showOnMain": BOOLEAN (only taken into account if logged in)
   * }
   *
   * @return Name of the output PDB file (same as given input PDB name).
   */
  router.post("/api/transformPdb", function (req, res) {

    var segmentId = req.body.segmentId;
    var targetPhi = req.body.targetPhi;
    var targetPsi = req.body.targetPsi;
    var constrPhi = req.body.constrPhi;
    var constrPsi = req.body.constrPsi;

    if (func.isEmptyString(segmentId)) {
      func.log("Segment ID was an empty string.");
      // No segment ID provided.
      return res.status(400).json(withCode(203));

    } else if (!func.correctTargetTorsionsFormat(targetPsi) || !func.correctTargetTorsionsFormat(targetPhi)) {
      func.log("Wrong target torsions format." + targetPsi + " " + targetPhi); // 207
      // Target torsions are in incorrect format.
      return res.status(400).json(withCode(207));

    } else if (!func.isPositiveIntegerArray(constrPsi) || !func.isPositiveIntegerArray(constrPhi)) {
      func.log("Wrong constrained torsions format. " + constrPsi + " " + constrPhi);
      // Constrained torsions in incorrect format.
      return res.status(400).withCode(208);
    }

    var date        = Date.now();
    var transformId = date + func.randomString(16);
    var pdbSrc      = strings.getPdbPath(transformId);
    var errorFile   = strings.getErrorPath(transformId);
    var metaFile    = strings.getTransformMetaPath(transformId);

    Segment.findOne({
       where: {id: segmentId}
     }).then(function (segment) {
       if (func.isUndefined(segment)) {
         // No such segment exists.
         return res.status(404).json(withCode(205));
       }

       fs.writeFile(pdbSrc, segment.pdb, function (err) {
         if (err) {
           func.log(`Failed to write ${pdbSrc},\n ${JSON.stringify(err)}`);
           // Generic server error.
           return res.status(500).json(withCode(0));
         }

         var pdbOut = strings.getTransformedPdbPath(transformId);
         var cmd = strings.matlabTransformCommand(
           pdbSrc, pdbOut,
           strings.toTargetTorsionMatlabFormat(targetPhi),
           strings.toTargetTorsionMatlabFormat(targetPsi),
           strings.toNumberArrayMatlabFormat(constrPhi),
           strings.toNumberArrayMatlabFormat(constrPsi),
           errorFile, metaFile
         );

         // Call the command to save the data in the file.
         exec(cmd, function (error) {
           if (error) {
             func.log(error);
             // Generic server error.
             return res.status(500).json(withCode(0));

           } else if (fs.existsSync(errorFile)) {
               return fs.readFile(errorFile, function (errorFileError, errorCode) {
                 func.log(`MATLAB error ${errorCode}`);
                 // Send the error given by MATLAB.
                 return res.status(500).json(withCode(errorCode));
               });
           } else if (!fs.existsSync(pdbOut)) {
             // If the file was not created, log the error and end the request.
             func.log(`Failed to save file ${pdbOut}`);
             // Generic server error.
             return res.status(500).json(withCode(0));

           } else if (!fs.existsSync(metaFile)) {
             func.log(`Failed to produce meta file ${metaFile}`);
             // Generic server error.
             return res.status(500).json(withCode(0));
           }

           // Read the contents of the PDB segment file.
           fs.readFile(pdbOut, function (pdbError, pdbData) {
             if (pdbError) {
               // On error, log the error and end the request.
               func.log(pdbError);
               // Generic server error.
               return res.status(500).json(withCode(0));

             } else if (func.isUndefined(pdbData)) {
               // Generic server error.
               return res.status(404).json(withCode(0));
             }

             fs.readFile(metaFile, function (metaError, metaData) {
               if (metaError) {
                 func.log(metaError);
                 // Generic server error.
                 return res.status(500).json(withCode(0));

               } else if (func.isUndefined(metaData)) {
                 func.log(`Empty metadata in transform ${transformId}`);
                 // Generic server error.
                 return res.status(500).json(withCode(0));
               }

               // Get the metadata as JSON to store it in the database.
               var metaJson = parseMetadata(metaData.toString().trim(), segment.start);

               // If the segment is own PDB (not shared), check the showOnMain flag's value.
               var showOnMain = true;
               if (func.isBoolean(req.body.showOnMain) && !segment.shared) {
                 showOnMain = req.body.showOnMain;
               }

               // Save the results in the database.
               Transform.create({
                 id:           transformId, // Hope that no collisions happen. TODO make sure
                 name:         date,
                 pdb:          pdbData.toString().trim(),
                 segment_id:   segment.id,
                 meta:         JSON.stringify(metaJson),
                 owner:        func.isUndefined(req.user) ? null : req.user.id,
                 show_on_main: showOnMain
               }).then(function (transform) {
                 // Remove the extraneous files.
                 fs.unlinkSync(pdbOut);
                 fs.unlinkSync(pdbSrc);
                 fs.unlinkSync(metaFile);

                 var result = jsonWithCode(10);
                 result.pdb = transform.id;

                 // On success, send the name of the PDB to the client to access it.
                 return res.status(200).json(result);
               }).catch(function (transformErr) {
                 func.log(JSON.stringify(transformErr));
                 // Generic server error.
                 return res.status(500).json(withCode(0));
               });
             });
           });
         });

       });
     }).catch(function (segError) {
       func.log(JSON.stringify(segError));
       return res.status(500).json(withCode(0));
     });
  }); // end POST "/api/transformPdb"



  /**
   * @return {JSON} {
   * _meta: { ... },
   *  data: [{
   *     "transformId": TRANSFORM_ID
   *     "dateCreated": DATE_CREATED_IN_ISO8601
   *     "proteinName": PROTEIN_NAME,
   *     "pdbCode": PDB_CODE
   *     "start": INITIAL_SEGMENT,
   *     "end": FINAL_SEGMENT,
   *     "chain": CHAIN_NAME,
   *     "segmentId": SEGMENT_ID,
   *   }, ...
   * ]
   */
  router.get("/api/getAllSharedTransforms", function (req, res) {
    var query = `
    SELECT tra.id AS transformId, tra.dateCreated as dateCreated,
       seg.name as proteinName, seg.pdb_name as pdbCode,
       seg.start as start, seg.end as end,
       seg.chain as chain, seg.id as segmentId
    FROM transforms tra JOIN segments seg ON tra.segment_id = seg.id
    WHERE tra.show_on_main = true;`;

    sequelize.query(query, {type: sequelize.QueryTypes.SELECT}).then(function (transforms) {
      var result = jsonWithCode(10);
      result.data = transforms;
      return res.status(200).json(result);
    }).catch(function (error) {
      func.log(error);
      return res.status(500).json(withCode(0));
    });
  });

  var availableLanguages = {
    "en": "English",
    "ja": "日本語",
    "ru": "Русский"
  };

  router.get("/api/getAvailableLanguages", function (req, res) {
    var result = jsonWithCode(10);
    result.data = availableLanguages;
    return res.status(200).json(result);
  });

  return router;
}
