const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { validateJobData } = require('../utils/Validator'); // Optional validator
const { authMiddleware, adminMiddleware } = require('../middleware/auth');  // Adjust the path if necessary
const { calculateJobRecommendations } = require('../utils/Recommendation'); // Import recommendation function

// Create a new job (Only admins should be able to post jobs)
router.post('/post-job', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const validationError = validateJobData(req.body);
        if (validationError) {
            return res.status(400).send({ message: validationError });
        }

        const job = await Job.create(req.body);
        res.status(201).send(job);
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).send({ message: 'Internal server error. Please try again later.' });
    }
});

// Get all jobs
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.findAll();
        res.status(200).send(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send({ message: 'Failed to retrieve jobs. Please try again later.' });
    }
});

// Get job by ID
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }
        res.status(200).send(job);
    } catch (error) {
        console.error('Error fetching job by ID:', error);
        res.status(500).send({ message: 'Error retrieving job. Please try again later.' });
    }
});

// Recommend jobs for a user
router.get('/recommend', authMiddleware, async (req, res) => {
    try {
        const userSkills = req.user.skills; // Extract user skills from the authenticated user
        const jobs = await Job.findAll(); // Fetch all jobs from the database
        const recommendedJobs = calculateJobRecommendations(userSkills, jobs);

        res.status(200).send(recommendedJobs);
    } catch (error) {
        console.error('Error recommending jobs:', error);
        res.status(500).send({ message: 'Error recommending jobs. Please try again later.' });
    }
});

module.exports = router;
