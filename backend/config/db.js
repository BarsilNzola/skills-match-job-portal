const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const poolerUrl = process.env.SUPABASE_DB_URL; // Your pooler URL

const commonConfig = {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 3,                 // Critical for Render's free tier
    min: 0,
    acquire: 30000,
    idle: 5000,
    evict: 10000            // Stale connection cleanup
  },
  retry: {
    max: 3,
    match: [/timeout/i, /connection/i]
  }
};

const sequelize = isProduction 
  ? new Sequelize(poolerUrl, {
      ...commonConfig,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        // Pooler-specific settings
        application_name: 'skills-match-app',
        connectionTimeoutMillis: 5000,
        keepAlive: true
      },
      // Prevent connection leaks
      hooks: {
        beforeDisconnect: (conn) => {
          console.log('Closing database connection');
          conn.end().catch(e => console.error('Connection close error:', e));
        }
      }
    })
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
      max: 2,  // Safer for local development
      min: 0,
      acquire: 30000,
      idle: 5000,
      evict: 10000
    },
    logging: msg => console.log(msg) // Controlled logging
  });

// Enhanced connection test
sequelize.authenticate()
  .then(() => {
    console.log(`🟢 Connected to ${isProduction ? 'Supabase Pooler' : 'Local DB'}`);
    // Verify pooler connection
    return sequelize.query('SELECT pg_backend_pid() AS pid, current_database() AS db');
  })
  .then(([results]) => {
    console.log('Connection verified:', results[0]);
  })
  .catch(err => {
    console.error('🔴 Connection failed:', err.message);
    if (isProduction) process.exit(1);
  });

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await sequelize.close().catch(e => console.error('Shutdown error:', e));
  console.log('Database connections closed');
});

module.exports = sequelize;