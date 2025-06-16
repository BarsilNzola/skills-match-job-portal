const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Job = require('../models/Job');
const { postJobFromImage } = require('../utils/jobImageProcessor');
const supabase = require('../utils/supabase'); // Import Supabase client

const router = express.Router();

// Set up multer for memory storage (no disk storage needed)
// 1. Enhanced Multer Configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (!validExtensions.includes(ext)) {
        return cb(new Error('Invalid file extension'), false);
      }
      
      // If we got this far, the file is valid
      cb(null, true);
    }
}).single('jobImage');

// Admin route to post a job from an image
router.post('/post-job', 
    // Important: No other middleware before Multer
    (req, res, next) => {
        console.log('Request headers:', req.headers);
        console.log('Content-Type:', req.headers['content-type']);
        next();
    },
    
    // Handle the upload
    (req, res) => {
        upload(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', {
                    message: err.message,
                    stack: err.stack
                });
                return res.status(400).json({ 
                    error: err.message,
                    details: {
                        code: err.code,
                        field: err.field
                    }
                });
            }

            if (!req.file) {
                console.error('No file received. Request body:', req.body);
                return res.status(400).json({
                    error: 'No file provided',
                    received: {
                        files: req.files,
                        bodyKeys: Object.keys(req.body)
                    }
                });
            }

            // File successfully received
            console.log('Upload successful:', {
                filename: req.file.originalname,
                size: req.file.size,
                bufferLength: req.file.buffer.length
            });

            // Process the file (upload to Supabase, etc.)
            try {
                const fileExt = path.extname(req.file.originalname);
                const fileName = `jobs/${Date.now()}${fileExt}`;
                
                const { error } = await supabase.storage
                    .from('job-images')
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: false
                    });

                if (error) throw error;

                res.json({ 
                    success: true,
                    filename: fileName
                });

            } catch (storageError) {
                console.error('Supabase upload failed:', storageError);
                res.status(500).json({
                    error: 'File storage failed',
                    details: storageError.message
                });
            }
        });
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