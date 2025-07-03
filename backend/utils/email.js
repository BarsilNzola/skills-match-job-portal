const nodemailer = require('nodemailer');

// Configure the base URL for local or production
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://talentpath-fkal.onrender.com'  // Production URL
  : 'http://localhost:10000';               // Development URL

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'Gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${BASE_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
        from: `"TalentPath" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #023436;">Welcome to TalentPath!</h2>
                <p>Please verify your email address to complete your registration:</p>
                <a href="${verificationUrl}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #FF8552; 
                          color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">
                    Verify Email
                </a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">${verificationUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };