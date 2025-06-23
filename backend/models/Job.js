const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Job = sequelize.define('Job', {
    title: {
        type: DataTypes.STRING(150),
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
    source: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['title', 'company', 'source'],
        },
    ],
})

module.exports = Job
