const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// GET all jobs (public) with optional pagination
router.get('/', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const jobs = await Job.findAll({
            attributes: ['id', 'title', 'company', 'location', 'description'],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        return res.status(500).json({ message: 'Failed to retrieve jobs.' });
    }
});

// GET single job (public)
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id, {
            attributes: ['id', 'title', 'company', 'location', 'description'],
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        return res.status(200).json(job);
    } catch (error) {
        console.error('Error retrieving job:', error.message);
        return res.status(500).json({ message: 'Error retrieving job.' });
    }
});

module.exports = router;
