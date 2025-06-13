const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/db');

const Job = sequelize.define('Job', {
    jobImage: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    company: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    skillsRequired: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    postedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
}, {
    timestamps: true,
});

module.exports = Job;
