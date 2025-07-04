const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User'); // Ensure this is the correct path to your User model
const { authMiddleware, adminMiddleware } = require('../middleware/auth');  // Adjust the path if necessary
const { sendVerificationEmail } = require('../utils/email');
const { calculateJobRecommendations } = require('../utils/Recommendation');
const { convertPdfToDocx, convertDocxToPdf } = require('../utils/conversionUtils');
const supabase = require('../utils/supabase');
const multer = require('multer');

const router = express.Router();
const memoryStorage = multer.memoryStorage();
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many download requests, please try again later',
    keyGenerator: (req) => {
      // Use the right-most IP in X-Forwarded-For (closest to client)
      const xff = req.headers['x-forwarded-for'];
      return xff 
        ? xff.split(',')[0].trim() 
        : req.ip;
    }
});

const convertLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each user to 5 conversions per window
    message: 'Too many conversion requests, please try again later'
});

const uploadAvatar = multer({
    storage: multer.memoryStorage(), // Store in memory for Supabase upload
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
  
const uploadCV = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx/;
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
    const errors = [];
  
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
      errors.push({ path: 'email', msg: 'Invalid email format' });
    }
  
    if (!data.password || data.password.length < 8) {
      errors.push({ path: 'password', msg: 'Password must be at least 8 characters long' });
    }
  
    return errors;
};

// Route: Register a new user
router.post('/register', async (req, res) => {
    try {
        const validationErrors = validateRegistration(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        const existingUser = await User.findOne({ where: { email: req.body.email } });
        if (existingUser) {
            return res.status(400).json({
                errors: [{ path: 'email', msg: 'Email already registered.' }]
            });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenExpires = Date.now() + 3600000; // 1 hour

        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            skills: req.body.skills || [],
            profile: req.body.profile || { experience: '', education: '', projects: [] },
            profileImage: 'default-avatar.jpg',
            cvFile: null,
            cvFileType: null,
            verificationToken,
            verificationTokenExpires
        });

        // Send verification email
        await sendVerificationEmail(user.email, verificationToken, user.name);

        res.status(201).json({ 
            message: 'Registration successful! Please check your email to verify your account.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// verification route
router.get('/verify-email', async (req, res) => {
    try {
        // Security headers
        res.setHeader('X-Frame-Options', 'DENY');
        
        const { token, email } = req.query;
        console.log('Raw verification request:', { token, email });
        
        if (!token?.trim() || !email?.trim()) {
            console.log('Missing parameters');
            return res.redirect('/login?error=missing_parameters');
        }

        const decodedEmail = decodeURIComponent(email).trim();
        const cleanToken = token.trim();
        
        console.log('Searching for user:', decodedEmail);
        console.log('Verification token:', cleanToken);
        console.log('Current time:', new Date());

        // 1. Find the user with matching token and unexpired time
        const user = await User.findOne({ 
            where: { 
                email: decodedEmail,
                verificationToken: cleanToken
            }
        });

        if (!user) {
            console.log('User not found or token mismatch');
            return res.redirect('/login?error=invalid_token');
        }

        console.log('Found user:', {
            id: user.id,
            currentToken: user.verificationToken,
            expiresAt: user.verificationTokenExpires,
            isVerified: user.isVerified
        });

        // Check token expiration
        if (new Date(user.verificationTokenExpires) < new Date()) {
            console.log('Token expired');
            return res.redirect('/login?error=invalid_token');
        }

        // 2. Update verification status
        const updateResult = await user.update({
            isVerified: true,
            verificationToken: null,
            verificationTokenExpires: null
        });

        console.log('Update result:', {
            isVerified: updateResult.isVerified,
            verificationToken: updateResult.verificationToken,
            verificationTokenExpires: updateResult.verificationTokenExpires
        });

        // 3. Successful redirect
        console.log('Verification successful, redirecting...');
        return res.redirect('/login?verified=1');
        
    } catch (error) {
        console.error('Verification failed:', {
            message: error.message,
            stack: error.stack,
            query: req.query
        });
        return res.redirect('/login?error=verification_failed');
    }
});

// resend verification route
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ 
                error: 'Email already verified',
                redirect: '/login' 
            });
        }

        const verificationToken = crypto.randomBytes(20).toString('hex');
        await user.update({
            verificationToken,
            verificationTokenExpires: Date.now() + 3600000 // 1 hour
        });

        await sendVerificationEmail(user.email, verificationToken);

        res.status(200).json({ 
            message: 'Verification email resent',
            email: user.email 
        });
        
    } catch (error) {
        console.error('Resend error:', error);
        res.status(500).json({ 
            error: 'Failed to resend verification',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Route: User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        const errors = [];
        if (!email) errors.push({ path: 'email', msg: 'Email is required' });
        if (!password) errors.push({ path: 'password', msg: 'Password is required' });

        if (errors.length > 0) {
        return res.status(400).json({ errors });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                errors: [{ path: 'email', msg: 'No account found with this email' }]
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                errors: [{ path: 'email', msg: 'Incorrect Password' }]
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                error: 'Email not verified',
                action: {
                    label: 'Resend verification email',
                    endpoint: '/resend-verification',
                    method: 'POST'
                },
                email: user.email // For frontend to use in resend
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                isVerified: true // Include verification status in token
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
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

        // Generate unique filename
        const fileExt = path.extname(req.file.originalname);
        const avatarPath = `user-avatars/${user.id}/avatar-${Date.now()}${fileExt}`;

        // Upload to Supabase
        const { error } = await supabase.storage
            .from('user-avatars')
            .upload(avatarPath, req.file.buffer, { 
                contentType: req.file.mimetype,
                upsert: true 
            });

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
            .from('user-avatars')
            .getPublicUrl(avatarPath);

            // Delete old file
            if (user.profileImage && !user.profileImage.includes('default-avatar')) {
            try {
                // Extract just the path after bucket
                const oldFilePath = user.profileImage.split(`${bucketUrl}/`).pop();
                await supabase.storage
                .from('user-avatars')
                .remove([oldFilePath]);
            } catch (deleteError) {
                console.error('Error deleting old avatar:', deleteError);
            }
        }

        // Update user with new avatar URL
        user.profileImage = publicUrl;
        await user.save();

        res.json({ 
            message: 'Profile picture uploaded successfully',
            profileImage: publicUrl
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/avatar/:userId', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        
        // 1. If no user or no profile image, use default avatar from Supabase
        if (!user || !user.profileImage) {
            const { data: { publicUrl } } = supabase.storage
                .from('user-avatars')
                .getPublicUrl('default-avatar.jpg');
            return res.redirect(publicUrl);
        }

        // 2. If profileImage is already a full URL (new Supabase format)
        if (user.profileImage.startsWith('http')) {
            return res.redirect(user.profileImage);
        }

        // 3. If profileImage is a path (legacy format)
        const { data: { publicUrl } } = supabase.storage
            .from('user-avatars')
            .getPublicUrl(user.profileImage);
        
        return res.redirect(publicUrl);

    } catch (error) {
        console.error('Avatar retrieval error:', error);
        
        // Fallback to hardcoded default if Supabase fails
        const hardcodedDefault = './uploads/avatars/default-avatar.jpg';
        return res.redirect(hardcodedDefault);
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

        // Generate unique filename
        const fileExt = path.extname(req.file.originalname);
        const cvPath = `user-cvs/${user.id}/cv-${Date.now()}${fileExt}`;

        // Upload to Supabase
        const { error } = await supabase.storage
            .from('user-cvs')
            .upload(cvPath, req.file.buffer, {   
                contentType: req.file.mimetype,
                upsert: true 
            });

            const { data: { publicUrl } } = supabase.storage
            .from('user-cvs')
            .getPublicUrl(cvPath);

        // Delete old CV if it exists
        if (user.cvFile && user.cvFile.startsWith('cvs/')) {
            try {
                await supabase.storage
                    .from('user-cvs')
                    .remove([user.cvFile]);
            } catch (deleteError) {
                console.error('Error deleting old CV:', deleteError);
            }
        }

        // Update user record
        user.cvFile = cvPath; // Store the path, not full URL for more control
        user.cvFileType = fileExt.replace('.', '');
        await user.save();

        res.json({ 
            message: 'CV uploaded successfully',
            filename: fileName,
            fileType: user.cvFileType
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/download-cv', downloadLimiter, authMiddleware, async (req, res) => {
    try {
        // Verify user and CV existence
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'cvFile', 'cvFileType'] // Include cvFileType if you store it
        });
        
        if (!user?.cvFile) {
            return res.status(404).json({ error: 'CV not found' });
        }

        // Generate signed URL
        const { data, error } = await supabase
            .storage
            .from('user-cvs')
            .createSignedUrl(user.cvFile, 3600);

        if (error) throw error;
        if (!data?.signedUrl) throw new Error('Failed to generate download URL');

        // Extract file extension (fallback to pdf if unknown)
        const fileExt = user.cvFileType 
            || user.cvFile.split('.').pop() 
            || 'pdf';
            
        // Sanitize username for filename
        const sanitizedName = user.name
            .toLowerCase()
            .replace(/\s+/g, '_')  // Replace spaces with underscores
            .replace(/[^a-z0-9_]/g, ''); // Remove special chars

        // Return URL with suggested filename
        res.json({
            url: data.signedUrl,
            filename: `${sanitizedName}_cv.${fileExt}`
        });

    } catch (error) {
        console.error('CV Download Error:', error);
        res.status(500).json({ 
            error: 'Download failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
  
router.post('/convert-cv', authMiddleware, async (req, res) => {
    const { format } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user?.cvFile) {
        return res.status(404).json({ error: 'CV not found' });
    }

    // === Get the extension from the existing file name ===
    const inputExt = path.extname(user.cvFile).toLowerCase(); // e.g., '.pdf'
    const outputExt = format === 'pdf' ? '.pdf' : '.docx';
    const outputFilename = `converted_cv_${Date.now()}${outputExt}`;

    try {
        // === Download the CV file buffer ===
        const { data: fileData, error } = await supabase.storage
            .from('user-cvs')
            .download(user.cvFile);

        if (error || !fileData) {
            throw new Error('Failed to download original CV from Supabase');
        }

        const buffer = Buffer.from(await fileData.arrayBuffer());

        // === Save buffer to temporary input file ===
        const tempInput = path.join('/tmp', `cv-input${inputExt}`);
        fs.writeFileSync(tempInput, buffer);

        const tempOutput = path.join('/tmp', outputFilename);

        // === Run conversion ===
        if (inputExt === '.pdf') {
            await convertPdfToDocx(tempInput, tempOutput);
        } else {
            await convertDocxToPdf(tempInput, tempOutput);
        }

        // === Upload converted file ===
        const fileBuffer = fs.readFileSync(tempOutput);
        await supabase.storage
            .from('user-cvs')
            .upload(`user-cvs/${user.id}/${outputFilename}`, fileBuffer, { upsert: true });

        user.cvFile = `user-cvs/${user.id}/${outputFilename}`;
        user.cvFileType = format;
        await user.save();

        res.json({ 
            success: true,
            message: 'Conversion successful',
            filename: outputFilename,
            downloadUrl: `/download-cv/${outputFilename}`,
            autoDownload: true
        });

    } catch (error) {
        console.error('Conversion error:', error);

        if (fs.existsSync(tempOutput)) {
            fs.unlinkSync(tempOutput);
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
