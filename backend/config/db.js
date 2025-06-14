const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = isProduction 
  ? new Sequelize(process.env.SUPABASE_DB_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: { 
          require: true,
          rejectUnauthorized: false
        },
        application_name: 'skills-match-app',
        keepAlive: true
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 30000,  // Increased idle timeout
        evict: 60000  // Only remove really stale connections
      }
    })
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST,
      dialect: 'mysql',
      logging: console.log
    });

// Connection verification with keepalive
async function verifyConnection() {
  try {
    await sequelize.authenticate();
    const [result] = await sequelize.query('SELECT 1+1 AS test');
    console.log(`✅ Database connected | Test query result: ${result[0].test}`);
    
    // Schedule periodic keepalive
    setInterval(async () => {
      await sequelize.query('SELECT 1').catch(err => 
        console.error('Keepalive failed:', err.message)
      );
    }, 15000); // Every 15 seconds
    
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    if (isProduction) {
      setTimeout(() => process.exit(1), 1000); // Graceful exit
    }
  }
}

verifyConnection();

module.exports = sequelize;