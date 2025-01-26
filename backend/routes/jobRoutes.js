const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Job = require('../models/Job');
const { validateJobData } = require('../utils/Validator'); // Optional validator
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { calculateJobRecommendations } = require('../utils/Recommendation');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Directory for uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique file naming
    },
});
const upload = multer({ storage });

// Default image URL
const DEFAULT_IMAGE_URL = '/uploads/placeholder-image.jpg';

// Create a new job (Only admins should be able to post jobs)
router.post(
    '/post-job',
    authMiddleware,
    adminMiddleware,
    upload.single('image'), // Handle image upload
    async (req, res) => {
        try {
            console.log('Request body:', req.body);
            console.log('Uploaded file:', req.file);

            const jobData = {
                ...req.body,
                image: req.file ? `/uploads/${req.file.filename}` : DEFAULT_IMAGE_URL,
            };

            const validationError = validateJobData(jobData);
            if (validationError) {
                return res.status(400).send({ message: validationError });
            }

            console.log('Job data to be saved:', jobData);

            const job = await Job.create(jobData);
            res.status(201).send(job);
        } catch (error) {
            console.error('Error creating job:', error);
            res.status(500).send({ message: 'Internal server error. Please try again later.' });
        }
    }
);

// Get all jobs
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            attributes: ['id', 'title', 'company', 'location', 'description', 'image'], // Include image field
        });
        res.status(200).send(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send({ message: 'Failed to retrieve jobs. Please try again later.' });
    }
});

// Get job by ID
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id, {
            attributes: ['id', 'title', 'company', 'location', 'description', 'image'], // Include image field
        });
        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        // Assign default image if not set
        if (!job.image) {
            job.image = DEFAULT_IMAGE_URL;
        }

        res.status(200).send(job);
    } catch (error) {
        console.error('Error fetching job by ID:', error);
        res.status(500).send({ message: 'Error retrieving job. Please try again later.' });
    }
});

// Recommend jobs for a user
router.get('/jobs/recommend', authMiddleware, async (req, res) => {
    try {
        const userSkills = req.user.skills; // Extract user skills from authenticated user
        const jobs = await Job.findAll({
            attributes: ['id', 'title', 'company', 'location', 'description', 'image'], // Include image field
        });
        const recommendedJobs = calculateJobRecommendations(userSkills, jobs);
        res.status(200).send(recommendedJobs);
    } catch (error) {
        console.error('Error recommending jobs:', error);
        res.status(500).send({ message: 'Error recommending jobs. Please try again later.' });
    }
});

// Update a job
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const job = await Job.findByPk(id);

        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        const updatedData = {
            ...req.body,
        };

        if (req.file) {
            updatedData.image = `/uploads/${req.file.filename}`;
        }

        // Update the job details
        const updatedJob = await job.update(updatedData);
        res.status(200).send(updatedJob);
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).send({ message: 'Internal server error. Please try again later.' });
    }
});

// Delete a job (Only admins should be able to delete jobs)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findByPk(jobId);

        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        // Delete the job
        await job.destroy();
        res.status(200).send({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).send({ message: 'Internal server error. Please try again later.' });
    }
});

module.exports = router;
