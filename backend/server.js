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

app.use(express.json());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://your-render-app.onrender.com' 
        : 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize services before starting server
async function initializeServer() {
    try {
        // 1. Initialize Skill Database
        await initSkillDatabase();
        console.log('Skill database initialized');

        // 2. Sync Database
        await sequelize.sync();
        console.log('Database synced successfully!');

        // 3. Start Server
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1); // Exit if critical initialization fails
    }
}

// Routes (can be moved before initializeServer if preferred)
app.use('/users', userRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.get('/', (req, res) => {
    res.send('Skill-Match Job Portal API');
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React app
    app.use(express.static(path.join(__dirname, '../frontend/build')));
    
    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Skill-Match Job Portal API (Development Mode)');
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

// Start everything
initializeServer();