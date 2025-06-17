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
            let jobData = {};
            let jobImageUrl = DEFAULT_IMAGE_URL;
            let ocrFailed = false;

            // 1. Always process image upload first (if exists)
            if (req.file) {
                const fileExt = path.extname(req.file.originalname);
                const fileName = `job-images/${Date.now()}${fileExt}`;
                
                // Upload to Supabase
                const { error } = await supabase.storage
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

                // 2. Attempt OCR processing
                try {
                    const ocrData = await postJobFromImage(req.file.buffer);
                    jobData = {
                        ...ocrData,
                        // Allow manual data to override OCR results
                        ...(req.body.title && { title: req.body.title }),
                        ...(req.body.company && { company: req.body.company }),
                        ...(req.body.description && { description: req.body.description })
                    };
                } catch (ocrError) {
                    console.warn('OCR processing failed:', ocrError);
                    ocrFailed = true;
                    // Continue with manual data below
                }
            }

            // 3. Fallback to manual data if:
            //    - No file uploaded
            //    - OCR failed
            //    - Manual data exists
            if (!req.file || ocrFailed || Object.keys(jobData).length === 0) {
                jobData = {
                    ...jobData, // Keep any OCR data that might exist
                    title: req.body.title || jobData.title || 'Untitled Position',
                    company: req.body.company || jobData.company || 'Unknown Company',
                    description: req.body.description || jobData.description || '',
                    skills: req.body.skills || jobData.skills || extractSkills(req.body.description || ''),
                    jobImage: jobImageUrl
                };
            }

            // 4. Auto-extract skills if missing
            if (!jobData.skills && jobData.description) {
                jobData.skills = extractSkills(jobData.description);
            }

            // 5. Create the job (temporarily disable validation if needed)
            // const validationError = validateJobData(jobData);
            // if (validationError) return res.status(400).send({ message: validationError });

            const job = await Job.create({
                jobImage: jobImageUrl,
                title: jobData.title,
                company: jobData.company,
                description: jobData.description,
                skillsRequired: jobData.skills,
                location: req.body.location || null,
                postedDate: new Date()
            });

            res.status(201).json({
                success: true,
                job,
                ...(ocrFailed && { warning: "OCR processing failed - used manual fields" })
            });

        } catch (error) {
            console.error('Error creating job:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            });
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