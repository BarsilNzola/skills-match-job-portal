const textract = require('textract');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const { extractSkills } = require('./skills-db');
const { correctSpelling } = require('./spellChecker');

// 1. Image Preprocessing
async function preprocessImage(imagePath) {
    try {
        console.log('Preprocessing image:', imagePath);
        if (!fs.existsSync(imagePath)) throw new Error(`Image not found: ${imagePath}`);

        const processedPath = path.join(__dirname, '../temp', `processed_${path.basename(imagePath)}`);
        
        await sharp(imagePath)
            .greyscale()
            .normalize()
            .sharpen({ sigma: 1.5, flat: 1, jagged: 1 })
            .linear(1.1, -(128 * 0.1))
            .threshold(150)
            .toFile(processedPath);

        return processedPath;
    } catch (error) {
        console.error('Image preprocessing failed:', error);
        throw new Error(`Image processing error: ${error.message}`);
    }
}

// 2. Clean Text
function cleanText(raw) {
    return raw
        .replace(/[^\x20-\x7E\n\r]/g, '') // Remove non-ASCII except newlines
        .replace(/\s{2,}/g, ' ')          // Collapse multiple spaces
        .replace(/\n{2,}/g, '\n')         // Collapse multiple line breaks
        .trim();
}

// 3. OCR Text Extraction
async function extractTextFromImage(filePath) {
    return new Promise((resolve, reject) => {
        // Verify file exists first
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${filePath}`));
        }

        const config = {
            preserveLineBreaks: true,
            exec: {
                // Timeout after 30 seconds
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer
                timeout: 30000
            },
            // Additional format-specific configs
            docx: {
                includeHeadersAndFooters: false
            },
            pdf: {
                pdftotextOptions: {
                    layout: 'layout',
                    dpi: 300
                }
            }
        };

        textract.fromFileWithPath(filePath, config, (error, text) => {
            if (error) {
                console.error(`Textract failed for ${path.basename(filePath)}:`, error);
                return reject(new Error(`Failed to extract text: ${error.message}`));
            }
            resolve(cleanText(text));
        });
    });
}

// 4. Company Name Extraction
function extractCompany(lines) {
    for (let line of lines) {
        const lower = line.toLowerCase();
        if (
            lower.includes('inc') || lower.includes('ltd') ||
            lower.includes('corp') || lower.includes('company') ||
            lower.includes('technologies') || lower.includes('solutions')
        ) {
            return line.replace(/[^\w\s]/g, '').trim();
        }
    }

    const fallback = lines.find(line => /@|www\.|\.com/i.test(line));
    return fallback ? fallback.replace(/[^\w\s]/g, '').trim() : 'Unknown Company';
}

// 5. Description Extraction
function extractDescription(lines) {
    return lines
        .slice(2)
        .filter(line => !line.match(/(www\.|@|\d{3}[-.\s]??\d{3}[-.\s]??\d{4}|email|phone)/i))
        .join('\n');
}

// 6. Email Extraction
function extractEmails(text) {
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g);
    return matches ? Array.from(new Set(matches)) : [];
}

// 7. Process OCR Result
async function processJobPosting(ocrText) {
    const correctedText = correctSpelling(ocrText);
    const lines = correctedText.split('\n').filter(line => line.trim());

    return {
        title: lines[0] || 'Untitled Position',
        company: extractCompany(lines),
        skills: extractSkills(correctedText),
        description: extractDescription(lines),
        emails: extractEmails(correctedText),
        correctedText
    };
}

// 8. Main Job Posting Logic
async function postJobFromImage(imagePath) {
    let processedPath;
    try {
        processedPath = await preprocessImage(imagePath);
        const rawText = await extractTextFromImage(processedPath);
        
        if (!rawText.trim()) throw new Error("OCR returned empty text");

        const { title, company, description, skills, emails } = await processJobPosting(rawText);

        const jobDetails = {
            title,
            company,
            description,
            skills,
            emails,
            jobImage: `/uploads/${path.basename(imagePath)}`
        };

        const existingJob = await Job.findOne({
            where: { title, company }
        });
        
        if (existingJob) throw new Error("Job listing already exists");

        return await Job.create(jobDetails);
    } finally {
        if (processedPath && fs.existsSync(processedPath)) {
            fs.unlinkSync(processedPath);
        }
    }
}

// 9. Cleanup on Exit
process.on('exit', async () => {
    if (worker) {
        await worker.terminate();
    }
});

module.exports = { postJobFromImage };
