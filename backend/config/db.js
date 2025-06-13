const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './.env' });

// Determine if we're in production (Supabase) or development (local MySQL)
const isProduction = process.env.NODE_ENV === 'production';

let sequelize;

if (isProduction) {
  // Supabase (PostgreSQL) configuration
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('Supabase database URL is missing in production environment');
  }

  sequelize = new Sequelize(process.env.SUPABASE_DB_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false
  });
} else {
  // Local MySQL configuration
  if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST) {
    throw new Error('Local database configuration environment variables are missing');
  }

  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: console.log // Enable logging in development
  });
}

// Test database connection
sequelize.authenticate()
  .then(() => console.log(`Connected to ${isProduction ? 'Supabase PostgreSQL' : 'local MySQL'} database`))
  .catch(err => console.error('Database connection error:', err.message));

module.exports = sequelize;