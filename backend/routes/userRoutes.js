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
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        console.log('Generated hash during registration:', hashedPassword);
        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            skills: req.body.skills || [],
            profile: req.body.profile || { experience: '', education: '', projects: [] }
        });
        console.log('Hash stored in DB:', user.password);


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
        if (!user) {
            return res.status(400).send({ error: 'Invalid login credentials' });
        }

        console.log('User found:', user.email); // Log the user email

        // Log the entered password and the stored hash for debugging
        console.log('Entered password:', req.body.password);
        console.log('Stored hash:', user.password);  // Check the stored hash
        console.log('Salt rounds used in stored hash:', user.password.split('$')[2]); // Extract salt rounds

        bcrypt.compare(req.body.password.trim(), user.password.trim(), (err, result) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send({ error: 'Internal server error' });
            }
        
            console.log('Password comparison result:', result); // Should print true if they match
            
            if (!result) {
                return res.status(400).send({ error: 'Invalid login credentials' });
            }
        
            // Continue with the token generation
            const token = jwt.sign(
                { id: user.id, email: user.email },  // Include user ID and email in the token payload
                process.env.JWT_SECRET,  // Secret key from environment variables
                { expiresIn: '1h' }  // Token expiration time (1 hour)
            );
    
            // Send token back to client
            res.json({ token });  // Send the token in the response
        });        

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});



// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        // Get user ID from the decoded token (auth middleware should decode and add user to req.user)
        const userId = req.user.id;

        const user = await User.findByPk(userId); // Fetch user by ID from the token
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            name: user.name,
            email: user.email,
            skills: user.skills || [],
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;
