const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const { createWorker } = Tesseract;

async function preprocessImage(imagePath) {
    try {
        console.log('Preprocessing image:', imagePath);

        // Check if the image file exists
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }

        // Define the output path for the processed image
        const processedImagePath = path.join(__dirname, '../temp/processed-image.jpg');
        console.log('Saving processed image to:', processedImagePath);

        // Process the image using sharp
        await sharp(imagePath)
            .greyscale() // Convert to grayscale
            .normalize() // Normalize brightness and contrast
            .toFile(processedImagePath); // Save the processed image

        console.log('Processed image saved successfully:', processedImagePath);
        return processedImagePath;
    } catch (error) {
        console.error('Error preprocessing image:', error);
        throw new Error(`Failed to preprocess image: ${error.message}`);
    }
}

async function extractTextFromImage(imagePath) {
    const worker = await createWorker();

    try {
        await worker.loadLanguage('eng'); // Load English language
        await worker.initialize('eng'); // Initialize with English
        await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%&*()-_=+[]{};:\'"<>/\\| ', // Allow common characters
        });

        const { data: { text } } = await worker.recognize(imagePath); // Recognize text
        await worker.terminate(); // Clean up worker

        return text;
    } catch (error) {
        console.error('Error during OCR:', error);
        await worker.terminate(); // Ensure worker is terminated even if an error occurs
        throw new Error('Failed to extract text from image.');
    }
}

function parseJobText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0); // Remove empty lines

    // Extract job title, company, and description
    const title = lines.find(line => line.match(/(Job Title|Position):?/i)) || "Untitled";
    const company = lines.find(line => line.match(/(Company|Employer):?/i)) || "Unknown Company";
    const description = lines.slice(2).join(' ') || "No description available.";

    return {
        title: title.replace(/(Job Title|Position):?/i, '').trim(),
        company: company.replace(/(Company|Employer):?/i, '').trim(),
        description,
    };
}

async function postJobFromImage(imagePath) {
    try {
        // Preprocess the image
        const processedImagePath = await preprocessImage(imagePath);

        // Extract text from the processed image
        const extractedText = await extractTextFromImage(processedImagePath);

        if (!extractedText.trim()) {
            throw new Error("OCR failed to extract job details.");
        }

        // Parse extracted text into job details
        const jobDetails = parseJobText(extractedText);

        // Add the image path to the job details
        jobDetails.jobImage = `/uploads/${path.basename(imagePath)}`;

        // Save job details to the database
        const newJob = await Job.create(jobDetails);
        console.log('Job successfully posted:', newJob);

        // Clean up: Delete the processed image file
        fs.unlinkSync(processedImagePath);

        return newJob;
    } catch (error) {
        console.error('Error posting job:', error.message);
        throw new Error(error.message); // Pass error to the calling function
    }
}

module.exports = { postJobFromImage };