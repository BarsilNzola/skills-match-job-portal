const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    skills: { type: DataTypes.JSON },
    profile: {
        type: DataTypes.JSON,
        defaultValue: { experience: '', education: '', projects: [] }
    }
});

module.exports = User;
