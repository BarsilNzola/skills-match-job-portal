const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const { validateJobData } = require('../utils/Validator');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { extractSkills } = require('../utils/skills-db');
const supabase = require('../utils/supabase'); // Add Supabase client

// Remove disk storage and use memory storage instead
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files allowed'), false);
      }
    }
}).single('jobImage');

const DEFAULT_IMAGE_URL = '/uploads/placeholder-image.jpg';

router.post(
    '/admin/post-job',
    authMiddleware,
    adminMiddleware,
    upload,
    async (req, res) => {
        try {
            let jobData;
            let jobImageUrl = DEFAULT_IMAGE_URL;

            if (req.file) {
                // Upload image to Supabase
                const fileExt = path.extname(req.file.originalname);
                const fileName = `job-images/${Date.now()}${fileExt}`;
                
                const { data, error } = await supabase.storage
                    .from('job-images')
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: true
                    });

                if (error) throw error;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('job-images')
                    .getPublicUrl(fileName);

                jobImageUrl = publicUrl;

                // Process via Python OCR (if still needed)
                // Note: You'll need to modify your Python script to work with file buffers
                // or implement a temporary file approach
                jobData = await postJobFromImage(req.file.buffer); // Modified function needed
                
                if (!jobData.skills) {
                    jobData.skills = extractSkills(jobData.description || '');
                }
            } else {
                // Manual input
                const { title, description, skills } = req.body;
                jobData = {
                    title,
                    description,
                    skills: skills || extractSkills(description),
                    jobImage: DEFAULT_IMAGE_URL
                };
            }

            // Add image URL to job data
            jobData.jobImage = jobImageUrl;

            const validationError = validateJobData(jobData);
            if (validationError) {
                return res.status(400).send({ message: validationError });
            }

            const job = await Job.create(jobData);
            res.status(201).send(job);
        } catch (error) {
            console.error('Error creating job:', error);
            res.status(500).send({ message: error.message || 'Internal server error.' });
        }
    }
);

router.get('/', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            attributes: ['id', 'title', 'company', 'location', 'description', 'jobImage'],
        });
        
        // Ensure all jobs have proper image URLs
        const jobsWithImages = jobs.map(job => ({
            ...job.toJSON(),
            jobImage: job.jobImage || DEFAULT_IMAGE_URL
        }));
        
        res.status(200).send(jobsWithImages);
    } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve jobs.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        // Ensure image URL exists
        const jobWithImage = {
            ...job.toJSON(),
            jobImage: job.jobImage || DEFAULT_IMAGE_URL
        };

        res.status(200).send(jobWithImage);
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving job.' });
    }
});

router.put('/:id', authMiddleware, adminMiddleware, upload, async (req, res) => {
    try {
        const { id } = req.params;
        const job = await Job.findByPk(id);

        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        let jobImageUrl = job.jobImage;

        if (req.file) {
            // Upload new image to Supabase
            const fileExt = path.extname(req.file.originalname);
            const fileName = `job-images/${Date.now()}${fileExt}`;
            
            const { error } = await supabase.storage
                .from('job-images')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('job-images')
                .getPublicUrl(fileName);

            jobImageUrl = publicUrl;
        }

        const updatedData = {
            title: req.body.title,
            description: req.body.description,
            location: req.body.location,
            salary: req.body.salary,
            company: req.body.company,
            jobImage: jobImageUrl
        };

        const updatedJob = await job.update(updatedData);
        res.status(200).send(updatedJob);
    } catch (error) {
        res.status(500).send({ message: 'Error updating job.' });
    }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        // Delete image from Supabase if it's not the default
        if (job.jobImage && !job.jobImage.includes('default-job')) {
            try {
                const fileName = job.jobImage.split('/').pop();
                await supabase.storage
                    .from('job-images')
                    .remove([`job-images/${fileName}`]);
            } catch (storageError) {
                console.error('Error deleting job image:', storageError);
            }
        }

        await job.destroy();
        res.status(200).send({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Error deleting job.' });
    }
});

module.exports = router;
