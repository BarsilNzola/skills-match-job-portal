const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const { createWorker } = Tesseract;
const cv = require('opencv4nodejs');

async function preprocessImage(imagePath) {
    try {
        console.log('Preprocessing image:', imagePath);
        if (!fs.existsSync(imagePath)) throw new Error(`Image not found: ${imagePath}`);

        const processedImagePath = path.join(__dirname, '../temp/processed-image.jpg');

        // Step 1: Convert to grayscale & increase contrast
        await sharp(imagePath)
            .greyscale()
            .normalize()
            .sharpen()
            .toFile(processedImagePath);

        // Step 2: Read processed image with OpenCV
        let img = cv.imread(processedImagePath, cv.IMREAD_GRAYSCALE);

        // Step 3: Deskew image (fix tilt)
        const deskewed = deskewImage(img);

        // Step 4: Apply adaptive thresholding for better OCR
        const binarized = deskewed.adaptiveThreshold(255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

        // Step 5: Save final cleaned image
        cv.imwrite(processedImagePath, binarized);
        
        console.log('Processed image saved successfully:', processedImagePath);
        return processedImagePath;
    } catch (error) {
        console.error('Error preprocessing image:', error);
        throw new Error(`Failed to preprocess image: ${error.message}`);
    }
}

function deskewImage(img) {
    // Ensure grayscale conversion
    if (img.channels > 1) {
        img = img.bgrToGray();
    }

    // Edge detection
    const edges = img.canny(50, 200);

    // Detect lines using Hough Transform
    const lines = edges.houghLinesP(1, Math.PI / 180, 50, 50, 10) || [];

    console.log("🔍 Detected lines:", lines.length);

    if (!Array.isArray(lines) || lines.length === 0) {
        console.error("❌ No lines detected. Skipping deskew.");
        return img;
    }

    let angles = [];

    lines.forEach(line => {
        try {
            let x1, y1, x2, y2;

            // Correctly extract coordinates from Vec4 object
            if (line instanceof cv.Vec4) {
                x1 = line.x;
                y1 = line.y;
                x2 = line.z;
                y2 = line.w;
            } else if (Array.isArray(line)) {
                [x1, y1, x2, y2] = line;
            } else {
                throw new Error("Invalid line format");
            }

            // Compute angle
            let theta = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

            // Ignore nearly vertical/horizontal lines (no deskew needed)
            if (Math.abs(theta) > 10 && Math.abs(theta) < 80) {
                angles.push(theta);
            }
        } catch (error) {
            console.error("❌ Error processing line:", line, error.message);
        }
    });

    if (angles.length === 0) {
        console.error("❌ No valid angles for deskewing.");
        return img;
    }

    // Use median angle to avoid outliers
    angles.sort((a, b) => a - b);
    let medianAngle = angles[Math.floor(angles.length / 2)];

    console.log(`🌀 Rotating image by ${medianAngle.toFixed(2)} degrees`);

    // Rotate image
    const center = new cv.Point(img.cols / 2, img.rows / 2);
    const rotationMatrix = cv.getRotationMatrix2D(center, medianAngle, 1);
    const rotated = img.warpAffine(rotationMatrix, new cv.Size(img.cols, img.rows));

    return rotated;
}

async function extractTextFromImage(imagePath) {
    const worker = await createWorker();

    try {
        await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%&*()-_=+[]{};:\'"<>/\\| ',
            tessedit_pageseg_mode: '3', // More adaptable segmentation
            user_defined_dpi: '300', // Ensures high-resolution text recognition
            preserve_interword_spaces: '1', // Keeps spacing between words
            textord_min_xheight: '20' // Ignores very small text (removes noise)
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


function cleanText(text) {
    // Remove unwanted characters and clean up the text
    return text
        .replace(/[^\w\s.,!?@#$%&*()-_=+[\]{};:'"<>/\\|]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
        .trim(); // Remove leading and trailing spaces
}

function parseJobText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // 1️⃣ Detect Capitalized Text as Job Title
    const title = lines.find(line => /^[A-Z\s]+$/.test(line)) || "Untitled";

    // 2️⃣ Extract First Occurring Email/Website as Company
    const company = lines.find(line => line.match(/@|www|\.com|Inc|Ltd|Corp/i)) || "Unknown Company";

    // 3️⃣ Use NLP to Extract Meaningful Description
    const description = extractMeaningfulText(lines.slice(2).join(' '));

    return {
        title: title.trim(),
        company: company.replace(/at/i, '').trim(),
        description: description
    };
}

// NLP Function to Extract Key Sentences for Job Description
function extractMeaningfulText(text) {
    const sentences = text.split('. ');
    const importantSentences = sentences.filter(sentence => sentence.length > 15); // Ignore short text

    return importantSentences.join('. ').trim();
}

async function postJobFromImage(imagePath) {
    try {
        const processedImagePath = await preprocessImage(imagePath);
        const extractedText = await extractTextFromImage(processedImagePath);
        if (!extractedText.trim()) throw new Error("OCR failed to extract job details.");

        const jobDetails = parseJobText(extractedText);
        jobDetails.jobImage = `/uploads/${path.basename(imagePath)}`;

        // Check if Job Already Exists
        const existingJob = await Job.findOne({ title: jobDetails.title, company: jobDetails.company });
        if (existingJob) {
            console.log('Duplicate job detected:', jobDetails);
            throw new Error("Job listing already exists.");
        }

        // Save New Job
        const newJob = await Job.create(jobDetails);
        console.log('Job successfully posted:', newJob);
        fs.unlinkSync(processedImagePath);
        return newJob;
    } catch (error) {
        console.error('Error posting job:', error.message);
        throw new Error(error.message);
    }
}

module.exports = { postJobFromImage };