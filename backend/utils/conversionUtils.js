const { PythonShell } = require('python-shell');
const { exec, execSync } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execAsync = util.promisify(exec);

async function convertPdfToDocx(inputPath, outputPath) {
    try {
        // 1. Get the absolute path to the Python script
        const scriptPath = path.join(
            __dirname, // Current directory (utils)
            '..', // Go up to backend
            'scripts', // Down to scripts
            'pdf_to_docx.py' // The script file
        );

        // 2. Verify the script exists
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Python script not found at: ${scriptPath}\n` +
                `Current working directory: ${process.cwd()}\n` +
                `Make sure the script exists at backend/scripts/pdf_to_docx.py`);
        }

        // 3. Configure Python options
        const options = {
            pythonPath: process.platform === 'win32' ? 'python' : 'python3',
            args: [
                inputPath.replace(/\\/g, '\\\\'),
                outputPath.replace(/\\/g, '\\\\')
            ],
            scriptPath: path.dirname(scriptPath) // Directory containing the script
        };

        console.log('Conversion starting with options:', {
            scriptLocation: scriptPath,
            pythonPath: options.pythonPath,
            input: options.args[0],
            output: options.args[1]
        });

        // 4. Run the conversion
        const results = await PythonShell.run('pdf_to_docx.py', options);
        console.log('Python script output:', results);

        // 5. Verify output
        if (!fs.existsSync(outputPath)) {
            throw new Error('Conversion completed but output file not found');
        }

        return outputPath;
    } catch (error) {
        console.error('Conversion failed:', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`PDF to DOCX conversion failed: ${error.message}`);
    }
}

async function convertDocxToPdf(inputPath, outputPath) {
    try {
        // Get the absolute path to the Python script
        const scriptPath = path.join(
            __dirname,
            '..', // Go up to backend
            'scripts',
            'docx_to_pdf.py'
        );

        // Verify the script exists
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Python script not found at: ${scriptPath}`);
        }

        const options = {
            pythonPath: process.platform === 'win32' ? 'python' : 'python3',
            args: [inputPath, outputPath],
            scriptPath: path.dirname(scriptPath)
        };

        console.log('Executing DOCX to PDF conversion with options:', options);
        const results = await PythonShell.run('docx_to_pdf.py', options);
        console.log('Python output:', results);

        if (!fs.existsSync(outputPath)) {
            throw new Error('Conversion completed but output file not found');
        }

        return outputPath;
    } catch (error) {
        console.error('DOCX to PDF conversion failed:', error);
        throw new Error(`PDF conversion failed: ${error.message}`);
    }
}

// Export both functions
module.exports = {
    convertPdfToDocx,
    convertDocxToPdf
};