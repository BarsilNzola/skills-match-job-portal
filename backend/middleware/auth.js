const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).send({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Assuming the token contains user info
        next(); // Proceed to the next middleware/route handler
    } catch (err) {
        console.error('Invalid token:', err);
        res.status(401).send({ message: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;