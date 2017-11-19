"use strict";
var Sequelize = require("sequelize");

var database = "torsdrive";
var username = "torsdrive_admin";
var password = ""; // THE PASSWORD GOES HERE
var host = "localhost";
var dbType = "mysql";

// Connection to the database.
var sequelize =
  new Sequelize(database, username, password, {
    "host": host,
    "dialect": dbType,
    "pool": {
      "max": 5,
      "min": 0,
      "idle": 10000
    },
    "define": {
      "freezeTableNames": true, // Use provided table names.
      "timestamps": false
    }
});


var Role = sequelize.define("role", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  name: {
    type: Sequelize.STRING(120),
    allowNull: false,
    unique: true
  }

});


// http://docs.sequelizejs.com/en/v3/docs/models-definition/
var User = sequelize.define("user", {

  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  username: {
    type: Sequelize.STRING(120),
    allowNull: false,
    unique: true
  },

  password: {
    type: Sequelize.STRING(512),
    allowNull: false
  },

  email: {
    type: Sequelize.STRING(120),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },

  preferredLanguage: {
    type: Sequelize.STRING(3),
  }

});

// Give a role ID foreign key to each user.
//Role.hasMany(User);
User.belongsTo(Role, {
  foreignKey: {
    name: "role_id",
    allowNull: false
  },
  onDelete: "RESTRICT"
});

/**
 * id:       VARCHAR(255) NOT NULL UNIQUE PK
 * pdb_name: VARCHAR(255)
 * name:     VARCHAR(255)
 * chain:    VARCHAR(255)
 * start:    INTEGER NOT NULL
 * end:      INTEGER NOT NULL
 * torsions: TEXT NOT NULL
 * shared:   BOOL NOT NULL DEFAULT TRUE
 * show_on_main: BOOL NOT NULL DEFAULT FALSE
 * pdb:      TEXT NOT NULL
 * owner:    INT FK (User:id)
 */
var Segment = sequelize.define("segment", {

  // Manually add the IDs.
  id: {
    type: Sequelize.STRING(255),
    primaryKey: true
  },

  // Name in the Protein Databank's database.
  pdb_name: {
    type: Sequelize.STRING(255),
    allowNull: true
  },

  // User-provided name.
  name: {
    type: Sequelize.STRING(255),
    allowNull: true
  },

  chain: {
    type: Sequelize.STRING(255),
    allowNull: false
  },

  start: {
    type: Sequelize.INTEGER,
    allowNull: false
  },

  // No checks if this is smaller than 'start' since that should be handled by the business logic.
  end: {
    type: Sequelize.INTEGER,
    allowNull: false
  },

  torsions: {
    type: Sequelize.TEXT,
    allowNull: false
  },

  // If transforms need to be explicitly shared.
  shared: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },

  show_on_main: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },

  pdb: {
    type: Sequelize.TEXT("long"),
    allowNull: false
  }
});

// Associate segments with users.
//User.hasMany(Segment);
Segment.belongsTo(User, {
  foreignKey: {
    name: "owner",
    allowNull: true
  },
  onDelete: "CASCADE"
});


var Transform = sequelize.define("transform", {
  // Manually add the IDs.
  id: {
    type: Sequelize.STRING(255),
    primaryKey: true
  },

  // User-provided name.
  name: {
    type: Sequelize.STRING(255),
    allowNull: true
  },

  // Don't need to be logged in in order to access by link.
  shared: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },

  show_on_main: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },

  meta: {
    type: Sequelize.TEXT,
    allowNull: false
  },

  pdb: {
    type: Sequelize.TEXT("long"),
    allowNull: false
  },

  dateCreated: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  }
});

// Associate transforms with users.
//User.hasMany(Transform);
Transform.belongsTo(User, {
  foreignKey: {
    name: "owner",
    allowNull: true
  },
  onDelete: "CASCADE"
});

// Associate transforms with segments.
//Segment.hasMany(Transform);
Transform.belongsTo(Segment, {
  foreignKey: {
    name: "segment_id",
    allowNull: false
  },
  onDelete: "CASCADE"
});


/**
 * Initialises all of the tables, creating them as necessary.
 *
 * @return {Object} Promise.
 */
var init = function () {
  return Role.sync().then(function () {
      return User.sync();
    }).then(function () {
      return Segment.sync();
    }).then(function () {
      return Transform.sync();
    });
};

// Export the needed functions and variables.
var db = module.exports = {};

db.sequelize = sequelize;
db.Role = Role;
db.User = User;
db.Segment = Segment;
db.Transform = Transform;
db.init = init;
