const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const DEFAULT_IMAGE_URL = '/uploads/placeholder-image.jpg';

// GET all jobs (public)
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            attributes: ['id', 'title', 'company', 'location', 'description', 'jobImage'],
        });
        
        const jobsWithImages = jobs.map(job => ({
            ...job.toJSON(),
            jobImage: job.jobImage || DEFAULT_IMAGE_URL
        }));
        
        res.status(200).send(jobsWithImages);
    } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve jobs.' });
    }
});

// GET single job (public)
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        const jobWithImage = {
            ...job.toJSON(),
            jobImage: job.jobImage || DEFAULT_IMAGE_URL
        };

        res.status(200).send(jobWithImage);
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving job.' });
    }
});

module.exports = router;