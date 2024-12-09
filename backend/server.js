const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');  // Import the admin routes
const sequelize = require('./config/db');  // Sequelize import for MySQL
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Initialize environment variables
dotenv.config();

// Set up express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000', // Replace with your frontend URL
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],  // Ensure 'Authorization' is allowed
}));

app.use(bodyParser.json());

// Serve static files (images) from 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define basic routes
app.use('/users', userRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);  // Register the admin routes
app.get('/', (req, res) => {
    res.send('Skill-Match Job Portal API');
});

// Synchronize Sequelize database 
sequelize.sync().then(() => {
    console.log('Database synced successfully!');
}).catch((err) => {
    console.log('Error syncing database:', err);
});

// Port and server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
