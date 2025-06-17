const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Job = require('../models/Job');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { extractSkills, validateJobData } = require('../utils/Validator');
const supabase = require('../utils/supabase');
const DEFAULT_IMAGE_URL = '/uploads/placeholder-image.jpg';

// Configure Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'), false);
        }
    }
}).single('jobImage');

// POST - Create job (with image upload)
router.post('/jobs', 
    authMiddleware,
    adminMiddleware,
    (req, res, next) => {
        upload(req, res, (err) => {
            if (err) return res.status(400).json({ error: err.message });
            next();
        });
    },
    async (req, res) => {
        try {
            let jobData;
            let jobImageUrl = DEFAULT_IMAGE_URL;

            if (req.file) {
                const fileExt = path.extname(req.file.originalname);
                const fileName = `job-images/${Date.now()}${fileExt}`;
                
                const { error } = await supabase.storage
                    .from('job-images')
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: true
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('job-images')
                    .getPublicUrl(fileName);

                jobImageUrl = publicUrl;
                jobData = req.body; // Or process OCR if needed
                
                if (!jobData.skills) {
                    jobData.skills = extractSkills(jobData.description || '');
                }
            } else {
                const { title, description, skills } = req.body;
                jobData = {
                    title,
                    description,
                    skills: skills || extractSkills(description),
                    jobImage: DEFAULT_IMAGE_URL
                };
            }

            jobData.jobImage = jobImageUrl;
            const validationError = validateJobData(jobData);
            if (validationError) return res.status(400).send({ message: validationError });

            const job = await Job.create(jobData);
            res.status(201).send(job);
        } catch (error) {
            console.error('Error creating job:', error);
            res.status(500).send({ message: error.message || 'Internal server error.' });
        }
    }
);

// PUT - Update job
router.put('/jobs/:id', 
    authMiddleware,
    adminMiddleware,
    (req, res, next) => {
        upload(req, res, (err) => {
            if (err) return res.status(400).json({ error: err.message });
            next();
        });
    },
    async (req, res) => {
        try {
            const { id } = req.params;
            const job = await Job.findByPk(id);
            if (!job) return res.status(404).send({ message: 'Job not found' });

            let jobImageUrl = job.jobImage;

            if (req.file) {
                const fileExt = path.extname(req.file.originalname);
                const fileName = `job-images/${Date.now()}${fileExt}`;
                
                const { error } = await supabase.storage
                    .from('job-images')
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('job-images')
                    .getPublicUrl(fileName);

                jobImageUrl = publicUrl;
            }

            const updatedData = {
                ...req.body,
                jobImage: jobImageUrl
            };

            const updatedJob = await job.update(updatedData);
            res.status(200).send(updatedJob);
        } catch (error) {
            res.status(500).send({ message: 'Error updating job.' });
        }
    }
);

// DELETE - Remove job
router.delete('/jobs/:id',
    authMiddleware,
    adminMiddleware, 
    async (req, res) => {
        try {
            const job = await Job.findByPk(req.params.id);
            if (!job) return res.status(404).send({ message: 'Job not found' });

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
    }
);

module.exports = router;