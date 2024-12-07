const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1]; // Get token from "Bearer token"

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET); // Verify token with the secret key
        req.user = decoded; // Attach the decoded user data to the request
        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};


module.exports = authMiddleware;