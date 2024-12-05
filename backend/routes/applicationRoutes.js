const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const auth = require('../middleware/auth');  // Ensure you're authenticating requests

// Create a new job application
router.post('/', auth, async (req, res) => {
    try {
        // Assuming the request body contains user ID, job ID, and any other relevant data
        const application = await Application.create({
            userId: req.user.id,   // assuming user is attached to req by the auth middleware
            jobId: req.body.jobId, 
            status: req.body.status || 'applied',   // Default status is 'applied'
            appliedDate: new Date()
        });

        res.status(201).send(application);  // Respond with the created application
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(400).send({ error: 'Error creating application' });
    }
});

// Get all applications for a user
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const applications = await Application.findAll({
            where: { userId: req.params.userId }
        });
        if (!applications) {
            return res.status(404).send({ message: 'No applications found' });
        }
        res.send(applications);  // Respond with the list of applications
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).send({ error: 'Error fetching applications' });
    }
});

// Get all applications for a specific job
router.get('/job/:jobId', async (req, res) => {
    try {
        const applications = await Application.findAll({
            where: { jobId: req.params.jobId }
        });
        if (!applications) {
            return res.status(404).send({ message: 'No applications found for this job' });
        }
        res.send(applications);  // Respond with the list of applications
    } catch (error) {
        console.error('Error fetching applications for job:', error);
        res.status(500).send({ error: 'Error fetching applications for job' });
    }
});

// Update an application status (e.g., from "applied" to "interviewed")
router.put('/:id', auth, async (req, res) => {
    try {
        const application = await Application.findByPk(req.params.id);
        if (!application) {
            return res.status(404).send({ message: 'Application not found' });
        }

        // Update application status or any other fields
        application.status = req.body.status || application.status;
        await application.save();  // Save the updated application

        res.send(application);  // Respond with the updated application
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).send({ error: 'Error updating application' });
    }
});

// Delete an application (optional, for removing a job application)
router.delete('/:id', auth, async (req, res) => {
    try {
        const application = await Application.findByPk(req.params.id);
        if (!application) {
            return res.status(404).send({ message: 'Application not found' });
        }

        await application.destroy();  // Delete the application
        res.status(200).send({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).send({ error: 'Error deleting application' });
    }
});

module.exports = router;
