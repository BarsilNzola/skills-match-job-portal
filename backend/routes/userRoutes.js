const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create a new user
router.post('/register', async (req, res) => {
    try {
        const user = await User.create({
            ...req.body,
            password: await bcrypt.hash(req.body.password, 8)
        });
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        user.token = token;
        await user.save();
        res.status(201).send({ user, token });
    } catch (error) {
        res.status(400).send(error);
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ where: { email: req.body.email } });
        if (!user || !await bcrypt.compare(req.body.password, user.password)) {
            return res.status(400).send({ error: 'Invalid login credentials' });
        }
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        user.token = token;
        await user.save();
        res.send({ user, token });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get user profile
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).send();
        }
        res.send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;
