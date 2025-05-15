const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Ensure this is the correct path to your User model
const { authMiddleware, adminMiddleware } = require('../middleware/auth');  // Adjust the path if necessary
const { calculateJobRecommendations } = require('../utils/Recommendation');
const { convertPdfToDocx, convertDocxToPdf } = require('../utils/conversionUtils');


const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 downloads per windowMs
  message: 'Too many download requests, please try again later'
});


// Configure storage for profile pictures
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadAvatar = multer({ 
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb('Error: Only image files (jpeg, jpg, png, gif) are allowed!');
    }
});

// CV Upload Config (reuses Multer but with different settings)
const cvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/cv/');  // Different folder for CVs
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'cv-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
  
const uploadCV = multer({ 
    storage: cvStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit (larger for CVs)
    fileFilter: (req, file, cb) => {
      const filetypes = /pdf|doc|docx/;  // Only allow CV formats
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);
      
      if (extname && mimetype) {
        return cb(null, true);
      }
      cb('Error: Only PDF/DOC/DOCX files are allowed!');
    }
});

// Validation function to check if the user input is correct
const validateRegistration = (data) => {
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
        return 'Invalid email format';
    }
    if (!data.password || data.password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    return null;
};

// Route: Register a new user
router.post('/register', async (req, res) => {
    try {
        const validationError = validateRegistration(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email: req.body.email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create the new user
        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            skills: req.body.skills || [],
            profile: req.body.profile || { experience: '', education: '', projects: [] },
            profileImage: 'default-avatar.jpg',  // Default avatar
            cvFile: null,         // No CV initially
            cvFileType: null      // No CV type initially
        });

        // Generate JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: 'User registered successfully.', user, token });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Route: User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid login credentials.' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid login credentials.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful.', token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id); // User ID comes from auth middleware
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,
            skills: user.skills || [],
            profile: user.profile || { experience: '', education: '', projects: [] },
            profileImage: user.profileImage || 'default-avatar.jpg',  
            cvFile: user.cvFile,     
            cvFileType: user.cvFileType
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/upload-avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete old avatar if it exists and isn't the default
        if (user.profileImage && user.profileImage !== 'default-avatar.jpg') {
            const oldAvatarPath = path.join(__dirname, '../uploads/avatars', user.profileImage);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        user.profileImage = req.file.filename;
        await user.save();

        res.json({ 
            message: 'Profile picture uploaded successfully',
            profileImage: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/avatar/:userId', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user || !user.profileImage) {
            // Return default avatar if none exists
            const defaultAvatar = path.join(__dirname, '../uploads/avatars/default-avatar.jpg');
            return res.sendFile(defaultAvatar);
        }

        const avatarPath = path.join(__dirname, '../uploads/avatars', user.profileImage);
        if (!fs.existsSync(avatarPath)) {
            const defaultAvatar = path.join(__dirname, '../uploads/avatars/default-avatar.jpg');
            return res.sendFile(defaultAvatar);
        }

        res.sendFile(avatarPath);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile (education, experience, projects)
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { education, experience, projects } = req.body;

        // Validate input
        if (!education && !experience && !projects) {
            return res.status(400).json({ error: 'At least one field (education, experience, or projects) is required.' });
        }

        // Find the user
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update the user's profile
        user.profile = {
            education: education || user.profile.education,
            experience: experience || user.profile.experience,
            projects: projects || user.profile.projects,
        };

        // Save the updated user
        await user.save();

        res.status(200).json({ message: 'Profile updated successfully.', profile: user.profile });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Route: Update user skills
router.put('/skills', authMiddleware , async (req, res) => {
    try {
        const { skills } = req.body;

        // Validate skills input
        if (!skills || !Array.isArray(skills)) {
            return res.status(400).json({ error: 'Skills must be an array.' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update user's skills
        user.skills = skills;
        await user.save();

        res.status(200).json({ message: 'Skills updated successfully.', skills: user.skills });
    } catch (error) {
        console.error('Error updating skills:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// CV upload route
router.post('/upload-cv', authMiddleware, uploadCV.single('cv'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
  
    const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
  
    // Delete old CV if it exists
    if (user.cvFile) {
        const oldCVPath = path.join(__dirname, '../uploads/cv', user.cvFile);
        if (fs.existsSync(oldCVPath)) {
          fs.unlinkSync(oldCVPath);
        }
    }
  
    // Update user with new CV
    user.cvFile = req.file.filename;
    user.cvFileType = path.extname(req.file.originalname).slice(1); // "pdf", "docx", etc.
    await user.save();
  
      res.json({ 
        message: 'CV uploaded successfully',
        filename: req.file.filename,
        fileType: user.cvFileType
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

router.get('/download-cv', downloadLimiter, authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || !user.cvFile) {
            return res.status(404).json({ error: 'CV not found' });
        }

        const filePath = path.join(__dirname, '../uploads/cv', user.cvFile);
        
        // Add security headers and proper file handling
        res.setHeader('Content-Disposition', `attachment; filename="${user.cvFile}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Set correct Content-Type based on file extension
        const fileExt = path.extname(user.cvFile).toLowerCase();
        const mimeType = fileExt === '.pdf' 
            ? 'application/pdf' 
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        res.setHeader('Content-Type', mimeType);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            res.status(500).end();
        });
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Download failed',
            details: error.message 
        });
    }
});

router.post('/convert-cv', authMiddleware, async (req, res) => {
    const { format } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user?.cvFile) {
        return res.status(404).json({ error: 'CV not found' });
    }

    const inputPath = path.join(__dirname, '../uploads/cv', user.cvFile);
    const outputFilename = `converted-${Date.now()}.${format}`;
    const outputPath = path.join(__dirname, '../uploads/cv', outputFilename);

    try {
        const inputExt = path.extname(inputPath).toLowerCase();
        
        // Validate supported conversion
        if (!(
            (inputExt === '.pdf' && format === 'docx') ||
            (inputExt === '.docx' && format === 'pdf')
        )) {
            return res.status(400).json({ error: 'Unsupported conversion' });
        }

        // Perform conversion
        if (inputExt === '.pdf') {
            await convertPdfToDocx(inputPath, outputPath);
        } else {
            await convertDocxToPdf(inputPath, outputPath);
        }

        // Update user record
        user.cvFile = outputFilename;
        user.cvFileType = format;
        await user.save();

        // Return success with auto-download instructions
        res.json({ 
            success: true,
            message: 'Conversion successful',
            filename: outputFilename,
            downloadUrl: `/download-cv/${outputFilename}`,
            autoDownload: true // Frontend can use this flag
        });

    } catch (error) {
        console.error('Conversion error:', error);
        
        // Clean up failed conversion output if it exists
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        
        res.status(500).json({ 
            error: 'Conversion failed',
            details: error.message,
            suggestion: 'Please try again or contact support'
        });
    }
});

// Route: Get recommended jobs for the user
router.get('/recommendations', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("Fetching job recommendations for user:", userId);

        // Call the recommendation function (ensure it exists and works properly)
        const recommendedJobs = await calculateJobRecommendations(userId);
        console.log("Recommended Jobs:", recommendedJobs);

        if (!recommendedJobs || recommendedJobs.length === 0) {
            console.log("No recommended jobs found");
            return res.status(200).json([]); // Return an empty array if no jobs are found
        }

        res.json(recommendedJobs);
    } catch (error) {
        console.error("Error recommending jobs:", error);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;
