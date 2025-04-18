const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs'); // For password hashing

const User = sequelize.define('User', {

    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true, // Ensures the email format is valid
        },
    },
    profileImage: {
        type: DataTypes.STRING, // stores filename/path
        allowNull: true,
        defaultValue: 'default-avatar.jpg' // optional default image
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [6, 100], // Password must be between 6 and 100 characters
        },
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user',
    },
    skills: {
        type: DataTypes.JSON, // Can store skills as a JSON object or array
        allowNull: true, // Allow null if no skills are provided
    },
    profile: {
        type: DataTypes.JSON,
        defaultValue: { experience: '', education: '', projects: [] }, // Default profile structure
    },
    cvFile: {
        type: DataTypes.STRING, // stores filename/path
        allowNull: true
    },
    cvFileType: {
        type: DataTypes.ENUM('pdf', 'doc', 'docx'),
        allowNull: true
    },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
});

// Compare password method for login
User.prototype.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password); // Compare the given password with the stored hash
};

module.exports = User;
