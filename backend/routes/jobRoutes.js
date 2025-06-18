const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const supabase = require('../utils/supabase');
const DEFAULT_IMAGE_URL = '/uploads/placeholder-image.jpg';

const BUCKET_NAME = 'job-images';

// Function to get public image URL from Supabase
const getPublicImageUrl = (path) => {
    if (!path) return DEFAULT_IMAGE_URL;

    const { data } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return data?.publicUrl || DEFAULT_IMAGE_URL;
};

// GET all jobs (public)
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            attributes: ['id', 'title', 'company', 'location', 'description', 'jobImage'],
        });

        const jobsWithImages = jobs.map(job => {
            const jobJson = job.toJSON();
            jobJson.jobImage = getPublicImageUrl(jobJson.jobImage);
            return jobJson;
        });

        res.status(200).send(jobsWithImages);
    } catch (error) {
        console.error('Error fetching jobs:', error);
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

        const jobJson = job.toJSON();
        jobJson.jobImage = getPublicImageUrl(jobJson.jobImage);

        res.status(200).send(jobJson);
    } catch (error) {
        console.error('Error retrieving job:', error);
        res.status(500).send({ message: 'Error retrieving job.' });
    }
});

module.exports = router;