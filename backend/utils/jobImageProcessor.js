const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const { extractSkills } = require('./skills-db');
const { correctSpelling } = require('./spellChecker');

// Worker instance
let worker;

async function getWorker() {
    if (!worker) {
        worker = await Tesseract.createWorker({
            logger: m => console.log(m) // Optional logging
        });
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
    }
    return worker;
}

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

async function extractTextFromImage(imagePath) {
    const worker = await getWorker();
    
    try {
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Maintain your important OCR configuration
      await worker.setParameters({
        tessedit_pageseg_mode: '6',       // Sparse text layout
        tessedit_ocr_engine_mode: '2',    // LSTM engine only
        preserve_interword_spaces: '1',   // Keep original spacing
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%&*()-_=+[]{};:\'"<>/\\| '
      });
  
      const { data: { text } } = await worker.recognize(imagePath);
      return text;
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`Text extraction failed: ${error.message}`);
    } finally {
      await worker.terminate().catch(e => console.error('Worker cleanup failed:', e));
    }
  }

async function processJobPosting(ocrText) {
    const correctedText = correctSpelling(ocrText);
    const lines = correctedText.split('\n').filter(line => line.trim());
    
    return {
        title: lines[0] || 'Untitled Position',
        company: extractCompany(lines),
        skills: extractSkills(correctedText),
        description: lines.slice(2).join('\n'),
        correctedText
    };
}

function extractCompany(lines) {
    const companyLine = lines.find(line => 
        line.match(/@|www\.|\.com|Inc|Ltd|Corp|Company/i)
    );
    return companyLine?.replace(/[^\w\s]|at$/gi, '').trim() || "Unknown Company";
}

async function postJobFromImage(imagePath) {
    let processedPath;
    try {
        processedPath = await preprocessImage(imagePath);
        const rawText = await extractTextFromImage(processedPath);
        
        if (!rawText.trim()) throw new Error("OCR returned empty text");

        const { title, company, description, skills } = await processJobPosting(rawText);

        const jobDetails = {
            title,
            company,
            description,
            skills,
            jobImage: `/uploads/${path.basename(imagePath)}`
        };

        const existingJob = await Job.findOne({ title, company });
        if (existingJob) throw new Error("Job listing already exists");

        return await Job.create(jobDetails);
    } finally {
        if (processedPath && fs.existsSync(processedPath)) {
            fs.unlinkSync(processedPath);
        }
        // Worker is kept alive for future requests
    }
}

// Cleanup when process exits
process.on('exit', async () => {
    if (worker) {
        await worker.terminate();
    }
});

module.exports = { postJobFromImage };