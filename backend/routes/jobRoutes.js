const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Job = require('../models/Job');
const { validateJobData } = require('../utils/Validator');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { calculateJobRecommendations } = require('../utils/Recommendation');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});


// Default image URL
const DEFAULT_IMAGE_URL = '/uploads/placeholder-image.jpg';

// Create a new job (Only admins should be able to post jobs)
router.post(
    '/post-job',
    authMiddleware,
    adminMiddleware,
    upload.single('jobImage'),
    async (req, res) => {
        console.log('Received file:', req.file); // Make sure req.file exists
        try {
            console.log('Request body:', req.body);
            console.log('Request file:', req.file);

            const jobData = {
                ...req.body,
                jobImage: req.file ? `/uploads/${req.file.filename}` : DEFAULT_IMAGE_URL,
            };

            console.log('Uploaded file:', req.file);
            console.log('Job Data:', jobData);

            const validationError = validateJobData(jobData);
            if (validationError) {
                return res.status(400).send({ message: validationError });
            }

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
            attributes: ['id', 'title', 'company', 'location', 'description', 'jobImage'],
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
            attributes: ['id', 'title', 'company', 'location', 'description', 'jobImage'],
        });
        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

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
        const userId = req.user.id; 
        console.log("Fetching recommendations for user:", userId);

        // Fetch user details
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const userSkills = user.skills ? user.skills.split(',') : [];
        console.log("User Skills:", userSkills);

        if (userSkills.length === 0) {
            return res.status(200).json([]); // No skills = No recommendations
        }

        // Fetch all jobs
        const jobs = await Job.findAll();
        console.log("Total jobs available:", jobs.length);

        // Use cosine similarity to get job recommendations
        const recommendedJobs = calculateJobRecommendations(userSkills.join(' '), jobs);
        
        res.json(recommendedJobs);
    } catch (error) {
        console.error("Error recommending jobs:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// Update a job
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const job = await Job.findByPk(id);

        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        const updatedData = {
            title: req.body.title,
            description: req.body.description,
            location: req.body.location,
            salary: req.body.salary,
            company: req.body.company
        };

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

        await job.destroy();
        res.status(200).send({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).send({ message: 'Internal server error. Please try again later.' });
    }
});

module.exports = router;
