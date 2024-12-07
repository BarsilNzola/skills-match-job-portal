const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { validateJobData } = require('../utils/Validator'); // Create a custom validator (optional)
const authMiddleware = require('../middleware/auth'); // Add auth middleware (optional)

// Create a new job
router.post('/', authMiddleware, async (req, res) => {
    try {
        // Validate job data (can be an external validator or custom function)
        const validationError = validateJobData(req.body);
        if (validationError) {
            return res.status(400).send({ message: validationError });
        }

        // Create a new job
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

module.exports = router;
