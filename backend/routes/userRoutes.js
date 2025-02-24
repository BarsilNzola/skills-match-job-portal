const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Ensure this is the correct path to your User model
const { authMiddleware, adminMiddleware } = require('../middleware/auth');  // Adjust the path if necessary
const { calculateJobRecommendations } = require('../utils/Recommendation');


const router = express.Router();

// Validation function to check if the user input is correct
const validateRegistration = (data) => {
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
        return 'Invalid email format';
    }
    if (!data.password || data.password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    return null;
};

// Route: Register a new user
router.post('/register', async (req, res) => {
    try {
        const validationError = validateRegistration(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email: req.body.email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create the new user
        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            skills: req.body.skills || [],
            profile: req.body.profile || { experience: '', education: '', projects: [] },
        });

        // Generate JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: 'User registered successfully.', user, token });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Route: User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid login credentials.' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid login credentials.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful.', token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id); // User ID comes from auth middleware
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            skills: user.skills || [],
            profile: user.profile || { experience: '', education: '', projects: [] },
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Update user profile (education, experience, projects)
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { education, experience, projects } = req.body;

        // Validate input
        if (!education && !experience && !projects) {
            return res.status(400).json({ error: 'At least one field (education, experience, or projects) is required.' });
        }

        // Find the user
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update the user's profile
        user.profile = {
            education: education || user.profile.education,
            experience: experience || user.profile.experience,
            projects: projects || user.profile.projects,
        };

        // Save the updated user
        await user.save();

        res.status(200).json({ message: 'Profile updated successfully.', profile: user.profile });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Route: Update user skills
router.put('/skills', authMiddleware , async (req, res) => {
    try {
        const { skills } = req.body;

        // Validate skills input
        if (!skills || !Array.isArray(skills)) {
            return res.status(400).json({ error: 'Skills must be an array.' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update user's skills
        user.skills = skills;
        await user.save();

        res.status(200).json({ message: 'Skills updated successfully.', skills: user.skills });
    } catch (error) {
        console.error('Error updating skills:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});



// Route: Get recommended jobs for the user
router.get('/recommendations', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("Fetching job recommendations for user:", userId);

        // Call the recommendation function (ensure it exists and works properly)
        const recommendedJobs = await calculateJobRecommendations(userId);
        console.log("Recommended Jobs:", recommendedJobs);

        if (!recommendedJobs || recommendedJobs.length === 0) {
            console.log("No recommended jobs found");
            return res.status(200).json([]); // Return an empty array if no jobs are found
        }

        res.json(recommendedJobs);
    } catch (error) {
        console.error("Error recommending jobs:", error);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;
