const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = util.promisify(exec);

// Use PYTHON_PATH env or fallback to local system python
const PYTHON_PATH = process.env.PYTHON_PATH || '/opt/venv/bin/python';

async function convertPdfToDocx(inputPath, outputPath) {
    try {
        const scriptPath = path.resolve(__dirname, '../scripts/pdf_to_docx.py');

        if (!fs.existsSync(scriptPath)) {
            throw new Error(`pdf_to_docx.py not found at ${scriptPath}`);
        }

        const cmd = `${PYTHON_PATH} "${scriptPath}" "${inputPath}" "${outputPath}"`;
        console.log('Running PDF to DOCX command:', cmd);

        const { stdout, stderr } = await execAsync(cmd);

        if (stderr) console.error('Python STDERR:', stderr);
        console.log('Python STDOUT:', stdout);

        if (!fs.existsSync(outputPath)) {
            throw new Error(`Conversion succeeded but output file not found: ${outputPath}`);
        }

        return outputPath;
    } catch (error) {
        console.error('PDF to DOCX conversion failed:', error);
        throw new Error(`PDF to DOCX conversion failed: ${error.message}`);
    }
}

async function convertDocxToPdf(inputPath, outputPath) {
    try {
        const scriptPath = path.resolve(__dirname, '../scripts/docx_to_pdf.py');

        if (!fs.existsSync(scriptPath)) {
            throw new Error(`docx_to_pdf.py not found at ${scriptPath}`);
        }

        const cmd = `${PYTHON_PATH} "${scriptPath}" "${inputPath}" "${outputPath}"`;
        console.log('Running DOCX to PDF command:', cmd);

        const { stdout, stderr } = await execAsync(cmd);

        if (stderr) console.error('Python STDERR:', stderr);
        console.log('Python STDOUT:', stdout);

        if (!fs.existsSync(outputPath)) {
            throw new Error(`Conversion succeeded but output file not found: ${outputPath}`);
        }

        return outputPath;
    } catch (error) {
        console.error('DOCX to PDF conversion failed:', error);
        throw new Error(`DOCX to PDF conversion failed: ${error.message}`);
    }
}

module.exports = {
    convertPdfToDocx,
    convertDocxToPdf
};
