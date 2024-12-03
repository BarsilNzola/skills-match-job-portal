const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Job = sequelize.define('Job', {
    title: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    skillsRequired: { type: DataTypes.JSON },
    location: { type: DataTypes.STRING },
    postedDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = Job;
