const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

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

// Create a new user
router.post('/register', async (req, res) => {
    try {
        const validationError = validateRegistration(req.body);
        if (validationError) {
            return res.status(400).send({ error: validationError });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email: req.body.email } });
        if (existingUser) {
            return res.status(400).send({ error: 'Email already registered' });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(req.body.password, 8);
        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            skills: req.body.skills || [],
            profile: req.body.profile || { experience: '', education: '', projects: [] }
        });

        // Generate JWT token with expiration (e.g., 1 hour)
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).send({ user, token });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ where: { email: req.body.email } });
        if (!user || !await bcrypt.compare(req.body.password, user.password)) {
            return res.status(400).send({ error: 'Invalid login credentials' });
        }

        // Generate JWT token with expiration
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.send({ user, token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Get user profile
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        res.send(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

module.exports = router;
