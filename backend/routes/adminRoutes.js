const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Job = require('../models/Job');
const { postJobFromImage } = require('../utils/jobImageProcessor');
const supabase = require('../utils/supabase'); // Import Supabase client

const router = express.Router();

// Set up multer for memory storage (no disk storage needed)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Admin route to post a job from an image
router.post(
    '/post-job',
    authMiddleware,       // Your authentication middleware
    adminMiddleware,      // Your admin check middleware
    upload.single('jobImage'), // Must match frontend field name
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            // Process the file (req.file contains the uploaded file)
            const file = req.file;
            
            // Upload to Supabase
            const fileExt = path.extname(file.originalname);
            const fileName = `job-images/${Date.now()}${fileExt}`;
            
            const { error } = await supabase.storage
                .from('job-images')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('job-images')
                .getPublicUrl(fileName);

            // Process the image (using your Python OCR script)
            const jobData = await postJobFromImage(req.file.buffer);
            
            // Add the image URL to job data
            jobData.jobImage = publicUrl;

            // Create the job in database
            const job = await Job.create(jobData);
            
            res.json({ 
                success: true,
                imageUrl: publicUrl
            });

        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to process image'
            });
        }
    }
);

// Admin route to delete a job
router.delete('/delete-job/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findByPk(jobId);

        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }

        // Delete associated image from Supabase if it exists
        if (job.jobImage) {
            try {
                // Extract the filename from the URL
                const urlParts = job.jobImage.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const fullPath = `job-images/${fileName}`;
                
                const { error: deleteError } = await supabase.storage
                    .from('job-images')
                    .remove([fullPath]);

                if (deleteError) {
                    console.error('Error deleting job image:', deleteError);
                }
            } catch (storageError) {
                console.error('Error cleaning up job image:', storageError);
            }
        }

        // Delete the job from the database
        await job.destroy();
        
        res.status(200).json({ 
            message: 'Job successfully deleted',
            deletedJobId: jobId
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ 
            message: 'Error deleting job. Please try again later.',
            error: error.message
        });
    }
});

module.exports = router;