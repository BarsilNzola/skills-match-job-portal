const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

async function postJobFromImage(imageBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create temp directory if it doesn't exist
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            // Create temp file
            const tempFilePath = path.join(tempDir, `temp-job-image-${Date.now()}.jpg`);
            await writeFile(tempFilePath, imageBuffer);

            const pythonScriptPath = path.join(__dirname, '../scripts/job_processor.py');
            
            exec(`python ${pythonScriptPath} "${tempFilePath}"`, async (error, stdout, stderr) => {
                try {
                    // Clean up temp file regardless of success/failure
                    await unlink(tempFilePath);
                } catch (cleanupError) {
                    console.error('Error cleaning up temp file:', cleanupError);
                }

                if (error) {
                    console.error('Python OCR error:', error);
                    return reject(new Error('Failed to process job image'));
                }
                
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (parseError) {
                    reject(new Error('Invalid OCR processing result'));
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { postJobFromImage };