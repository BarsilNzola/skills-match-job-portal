const crypto = require('crypto');
const nodemailer = require('nodemailer');

const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://talentpath-fkal.onrender.com'
  : 'http://localhost:10000';

// 1. Improved transporter with DKIM-like settings
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'Gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  },
  // Anti-spam settings
  pool: true,
  rateLimit: 5, // Max 5 emails per second
  tls: {
    rejectUnauthorized: false // Only for development/testing
  }
});

// 2. Enhanced email headers and content
const sendVerificationEmail = async (email, token, userName = 'User') => {
    const verificationUrl = `${BASE_URL}/api/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  
  const mailOptions = {
    from: `"TalentPath" <${process.env.EMAIL_FROM || 'no-reply@talentpath.com'}>`,
    to: email,
    // 3. Better subject line
    subject: `${userName}, verify your email for TalentPath`,
    // 4. Improved HTML with text fallback
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #023436;">Welcome to TalentPath!</h2>
        <p>Hi ${userName},</p>
        <p>Please verify your email address to complete your registration:</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; padding: 10px 20px; background-color: #FF8552; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">
          Verify Email
        </a>
        <p>Or copy this link into your browser:<br>
        <code style="word-break: break-all;">${verificationUrl}</code></p>
        <p style="font-size: 12px; color: #666;">
          This link expires in 1 hour. Sent to ${email}.
        </p>
      </div>
    `,
    text: `Hi ${userName},\n\nPlease verify your email by visiting:\n${verificationUrl}\n\nThis link expires in 1 hour.`, // Plain text version
    // 5. Critical anti-spam headers
    headers: {
      'X-Entity-Ref-ID': crypto.randomBytes(16).toString('hex'),
      'List-Unsubscribe': `<mailto:unsubscribe@talentpath.com?subject=Unsubscribe>`,
      'Precedence': 'bulk' // For Gmail filtering
    },
    // 6. Important metadata
    priority: 'high',
    dkim: {
      domainName: "talentpath.com", // Your domain if you have one
      keySelector: "2023",
      privateKey: process.env.DKIM_PRIVATE_KEY || ''
    }
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = { sendVerificationEmail };