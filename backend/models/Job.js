const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/db');

const Job = sequelize.define('Job', {
    image: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    company: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    skillsRequired: {
        type: DataTypes.JSON, // This could be a string or an array if you don't need to store it as JSON
        allowNull: true, // Allow null if skillsRequired is not mandatory
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true, // Make location optional
    },
    postedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false, // Make postedDate not nullable
    },
}, {
    timestamps: true, // Automatically add createdAt and updatedAt
});

// You can add associations here (if any) after defining the model
// Job.associate = models => {
//     Job.hasMany(models.Application); // If a job can have multiple applications
// };

module.exports = Job;
