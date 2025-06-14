const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const { initSkillDatabase } = require('./utils/skills-db');

const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '.env') });

// 2. Debug environment immediately - CRITICAL FOR DIAGNOSIS
console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    SUPABASE_DB_URL: process.env.SUPABASE_DB_URL ? 'exists' : 'missing'
  });

const app = express();

// 1. Middlewares
app.use(express.json());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://skills-match.onrender.com' 
        : 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Production static files
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// 3. Routes
app.use('/users', userRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// 4. Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        port: server.address().port,
        database: 'connected'
    });
});

// 5. Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 8. Server initialization
let server;

async function startServer() {
    try {
        // Initialize database
        const { initSkillDatabase } = require('./utils/skills-db');
        const sequelize = require('./config/db');
        
        await initSkillDatabase();
        await sequelize.sync();
        
        // PORT assignment - RENDER-SPECIFIC LOGIC
        const PORT = (() => {
          const renderPort = process.env.PORT;
          if (!renderPort && process.env.NODE_ENV === 'production') {
            console.error('FATAL: Render did not provide PORT');
            process.exit(1);
          }
          return renderPort ? parseInt(renderPort) : 5000;
        })();

        console.log(`Starting server on port: ${PORT}`);

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Server running on: ${server.address().port}`);
        });

        server.on('error', error => {
            console.error(`❌ FATAL PORT ERROR (${PORT}):`, error.code);
            process.exit(1); // Let Render handle restarts
        });

    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
}

startServer();