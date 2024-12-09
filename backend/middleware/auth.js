const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure the User model is correctly implemented

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', ''); // Get token from Authorization header

    if (!token) {
        return res.status(401).json({ message: 'No token provided. Please log in.' });
    }

    try {
        // Verify the token and extract user data
        console.log("Token received:", token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded);

        const user = await User.findByPk(decoded.id); // Get user from the database

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = { id: user.id, email: user.email, role: user.role }; // Include role        
        next(); // Continue to the next middleware or route
    } catch (error) {
        console.error("Error decoding token:", error); // Log error for debugging
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please log in again.' });
        }
        res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };
