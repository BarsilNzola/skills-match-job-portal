const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Job = require('../models/Job');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { extractSkills } = require('../utils/skills-db');
const { validateJobData } = require('../utils/Validator');
const { postJobFromImage } = require('../utils/jobImageProcessor');
const supabase = require('../utils/supabase');
const DEFAULT_IMAGE_PATH = null;

// Multer config
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'), false);
        }
    }
}).single('jobImage');

// POST - Create job
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
            let uploadedImagePath = DEFAULT_IMAGE_PATH;
            let ocrFailed = false;

            // Upload image to Supabase if provided
            if (req.file) {
                const fileExt = path.extname(req.file.originalname);
                const fileName = `job-${Date.now()}${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('job-images')
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('❌ Error uploading to Supabase:', uploadError.message);
                    throw uploadError;
                }

                const { data, error: urlError } = supabase.storage
                    .from('job-images')
                    .getPublicUrl(fileName);

                if (urlError) {
                    console.error('❌ Failed to get public URL:', urlError.message);
                }

                if (data?.publicUrl) {
                    uploadedImagePath = data.publicUrl;
                    console.log('✅ Final image URL:', uploadedImagePath);
                } else {
                    console.error('❌ Supabase did not return a public URL');
                }
            }

            // OCR logic (if file present)
            if (req.file) {
                try {
                    const ocrData = await postJobFromImage(req.file.buffer);
                    jobData = {
                        ...ocrData,
                        ...(req.body.title && { title: req.body.title }),
                        ...(req.body.company && { company: req.body.company }),
                        ...(req.body.description && { description: req.body.description }),
                    };
                } catch (ocrError) {
                    console.warn('⚠️ OCR processing failed:', ocrError);
                    ocrFailed = true;
                }
            }

            // Fallback if OCR fails or no image
            if (!req.file || ocrFailed || Object.keys(jobData).length === 0) {
                jobData = {
                    title: req.body.title || 'Untitled Position',
                    company: req.body.company || 'Unknown Company',
                    description: req.body.description || '',
                };
            }

            // Skills extraction
            if (!jobData.skills && jobData.description) {
                try {
                    jobData.skills = extractSkills(jobData.description);
                } catch (e) {
                    console.warn('⚠️ Skill extraction failed:', e.message);
                    jobData.skills = [];
                }
            }

            if (!jobData) {
                return res.status(500).json({ success: false, message: 'Failed to extract job data from image.' });
            }

            // Validate job data before saving
            const { isValid, errors } = validateJobData(jobData);
            if (!isValid) {
                return res.status(400).json({ success: false, errors });
            }

            // Final job creation
            const job = await Job.create({
                jobImage: uploadedImagePath,
                title: jobData.title,
                company: jobData.company,
                description: jobData.description,
                skillsRequired: jobData.skills,
                location: req.body.location || null,
                postedDate: new Date(),
            });

            console.log('📝 Job saved:', job.toJSON());

            res.status(201).json({
                success: true,
                job,
                ...(ocrFailed && { warning: 'OCR processing failed - used manual fields' }),
            });
        } catch (error) {
            console.error('❌ Error creating job:', error);
            res.status(500).json({ error: 'Internal server error' });
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
            if (!job) return res.status(404).json({ message: 'Job not found' });

            let uploadedImagePath = job.jobImage;

            if (req.file) {
                const fileExt = path.extname(req.file.originalname);
                const fileName = `job-${Date.now()}${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('job-images')
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('❌ Error uploading to Supabase:', uploadError.message);
                    throw uploadError;
                }

                const { data, error: urlError } = supabase.storage
                    .from('job-images')
                    .getPublicUrl(fileName);

                if (urlError) {
                    console.error('❌ Failed to get public URL:', urlError.message);
                }

                if (data?.publicUrl) {
                    uploadedImagePath = data.publicUrl;
                    console.log('✅ Final image URL:', uploadedImagePath);
                }
            }

            const updatedData = {
                ...req.body,
                jobImage: uploadedImagePath,
            };

            const updatedJob = await job.update(updatedData);
            res.status(200).json(updatedJob);
        } catch (error) {
            console.error('❌ Error updating job:', error);
            res.status(500).json({ message: 'Error updating job.' });
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
            if (!job) return res.status(404).json({ message: 'Job not found' });

            if (job.jobImage) {
                try {
                    const imagePath = job.jobImage.replace(/^.*\/job-images\//, '');
                    await supabase.storage
                        .from('job-images')
                        .remove([imagePath]);
                    console.log('🗑️ Deleted image:', imagePath);
                } catch (storageError) {
                    console.error('❌ Error deleting job image:', storageError);
                }
            }

            await job.destroy();
            res.status(200).json({ message: 'Job deleted successfully' });
        } catch (error) {
            console.error('❌ Error deleting job:', error);
            res.status(500).json({ message: 'Error deleting job.' });
        }
    }
);

module.exports = router;
