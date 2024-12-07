const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './.env'});

// Validate that critical environment variables are present
if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST) {
    throw new Error('Database configuration environment variables are missing.');
}

// Initialize Sequelize with environment variables and connection pool settings
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
        max: 5,          // Maximum number of connections in the pool
        min: 0,          // Minimum number of connections in the pool
        acquire: 30000,  // Maximum time (ms) to acquire a connection before throwing an error
        idle: 10000      // Maximum time (ms) a connection can be idle before being released
    },
    logging: false       // Disable SQL query logging in production
});

// Test database connection
sequelize.authenticate()
    .then(() => console.log('Database connected successfully.'))
    .catch(err => console.error('Database connection error:', err.message));

module.exports = sequelize;
