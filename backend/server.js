const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const { initSkillDatabase } = require('./utils/skills-db'); // Add this import

const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

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

// 2. Production static files (MUST come before routes)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// Routes (can be moved before initializeServer if preferred)
app.use('/users', userRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.get('/', (req, res) => {
    res.send('Skill-Match Job Portal API');
});

// 4. Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// 5. Final catch-all route for production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });
}

// Middlewares
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 7. Initialize and start server
async function startServer() {
    try {
        await initSkillDatabase();
        await sequelize.sync();
        
        const PORT = process.env.PORT || 5000;

        const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server ACTUALLY running on: ${PORT}`); // Add this log
        });

        // Add this error handler
        server.on('error', error => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Fatal: Port ${PORT} in use`);
            process.exit(1); // Exit completely to let Render restart
        }
        });

    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
}

startServer();