const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Application = sequelize.define('Application', {
    status: {
        type: DataTypes.ENUM('applied', 'reviewed', 'accepted', 'rejected'), // Restrict to specific values
        defaultValue: 'applied',
        allowNull: false,
    },
    appliedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    timestamps: true, // Defaults to true, but explicitly stated here for clarity
});

// Define associations
Application.associate = models => {
    Application.belongsTo(models.Job, {
        foreignKey: { allowNull: false }, // Ensure Job is mandatory
        onDelete: 'CASCADE',             // Automatically remove applications when the Job is deleted
    });
    Application.belongsTo(models.User, {
        foreignKey: { allowNull: false }, // Ensure User is mandatory
        onDelete: 'CASCADE',             // Automatically remove applications when the User is deleted
    });
};

module.exports = Application;
