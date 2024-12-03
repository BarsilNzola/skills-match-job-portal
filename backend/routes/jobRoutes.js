const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// Create a new job
router.post('/', async (req, res) => {
    try {
        const job = await Job.create(req.body);
        res.status(201).send(job);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Get all jobs
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.findAll();
        res.send(jobs);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get job by ID
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).send();
        }
        res.send(job);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;
