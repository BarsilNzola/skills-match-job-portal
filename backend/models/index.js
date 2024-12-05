const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');
const { Sequelize, DataTypes } = require('sequelize');

// Create an object to store all models
const db = {};

// Read all files in the current directory and load models
fs.readdirSync(__dirname)
    .filter(file => file !== 'index.js') // Skip the current file
    .forEach(file => {
        const model = require(path.join(__dirname, file));
        db[model.name] = model;
    });

// Initialize all associations (if defined)
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

// Set Sequelize instance and DataTypes for all models
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
