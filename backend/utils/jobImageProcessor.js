const Tesseract = require('tesseract.js');
const { Job } = require('../models/Job');

function extractTextFromImage(imagePath) {
    return new Promise((resolve, reject) => {
        Tesseract.recognize(
            imagePath, // Path to the image
            'eng',     // Language (English)
            { logger: (m) => console.log(m) } // Optional: log progress
        )
        .then(({ data: { text } }) => resolve(text))
        .catch((error) => reject(error));
    });
}

async function postJobFromImage(imagePath) {
    try {
        const extractedText = await extractTextFromImage(imagePath);

        if (!extractedText.trim()) {  // Check if text is empty or invalid
            throw new Error("OCR failed to extract job details.");
        }

        const jobDetails = parseJobText(extractedText); // Parse extracted text

        // Save job details to the database
        const newJob = await Job.create(jobDetails);
        console.log('Job successfully posted:', newJob);

        return newJob;
    } catch (error) {
        console.error('Error posting job:', error.message);
        throw new Error(error.message); // Pass error to the calling function
    }
}

function parseJobText(text) {
    const lines = text.split('\n');
    const title = lines[0] || "Untitled"; // Fallback to "Untitled"
    const description = lines.slice(1).join(' ') || "No description available.";

    return {
        title,
        description,
    };
}

module.exports = { postJobFromImage };
