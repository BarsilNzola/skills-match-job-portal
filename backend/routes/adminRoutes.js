const express = require('express');
const multer = require('multer');
const path = require('path');
const { postJobFromImage } = require('../utils/jobImageProcessor'); // Ensure this utility is properly implemented
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Job = require('../models/Job');

const router = express.Router();

// Set up multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Set the uploads directory relative to the backend root
        cb(null, path.join(__dirname, '..', 'uploads'));  // This will point to backend/uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Save files with unique names
    },
});

const upload = multer({ storage });

// Admin route to post a job from an image
router.post(
    '/post-job',
    authMiddleware,
    adminMiddleware,
    upload.single('jobImage'),
    async (req, res) => {
        try {
            const imagePath = req.file?.path;
            if (!imagePath) {
                return res.status(400).json({ message: 'No image file uploaded.' });
            }

            const job = await postJobFromImage(imagePath);
            res.status(200).json({ message: 'Job successfully posted!', job });
        } catch (error) {
            console.error(error);
            res.status(400).json({ message: error.message });
        }
    }
);

// Admin route to delete a job
router.delete('/delete-job/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findByPk(jobId);

        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        await job.destroy();  // Delete the job from the database
        res.status(200).json({ message: 'Job successfully deleted' });
    } catch (error) {
        console.error('Error deleting job in admin route:', error);
        res.status(500).json({ message: 'Error deleting job. Please try again later.' });
    }
});



module.exports = router;
