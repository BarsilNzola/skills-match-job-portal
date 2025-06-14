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

// Debug environment immediately
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

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

// 6. Server initialization
let server; // Declare server at module level

async function startServer() {
    try {
        await initSkillDatabase();
        await sequelize.sync();
        
        // PORT assignment - CRITICAL CHANGE
        const PORT = process.env.PORT || 5000;
        console.log(`Starting server on port: ${PORT}`);

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Server running on: ${server.address().port}`);
            console.log(`➡️ Health check at: http://0.0.0.0:${server.address().port}/api/health`);
        });

        server.on('error', error => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} in use - NOT retrying`);
            } else {
                console.error('Server error:', error);
            }
            process.exit(1);
        });

        // Memory monitoring
        setInterval(() => {
            const used = process.memoryUsage();
            console.log(`Memory usage: ${Math.round(used.rss / 1024 / 1024)}MB`);
        }, 30000);

    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received - shutting down');
    server?.close(() => {
        sequelize.close().then(() => {
            console.log('Server and database connections closed');
            process.exit(0);
        });
    });
});

startServer();