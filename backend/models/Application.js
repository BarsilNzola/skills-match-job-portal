const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Application = sequelize.define('Application', {
    status: { type: DataTypes.STRING, defaultValue: 'applied' },
    appliedDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

Application.associate = models => {
    Application.belongsTo(models.Job);
    Application.belongsTo(models.User);
};

module.exports = Application;
