const { cosineSimilarity, vectorizeText } = require('./TextSimilarity');
const { spawn } = require('child_process');
const Job = require('../models/Job');
const User = require('../models/User');
const path = require('path');

// Fetch user skills dynamically
async function fetchUserSkills(userId) {
    try {
        const user = await User.findByPk(userId, { attributes: ['skills'] });
        if (!user || !user.skills || !Array.isArray(user.skills)) {
            console.error('Invalid or missing user skills', user?.skills);
            return [];
        }
        return user.skills; // Return array directly
    } catch (error) {
        console.error('Error fetching user skills:', error);
        throw new Error('Failed to fetch user skills');
    }
}


// Extract skills from job descriptions using Python AI-ML model
function extractSkillsFromJobs(jobDescriptions) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(jobDescriptions) || jobDescriptions.length === 0) {
            console.error("Invalid jobDescriptions input:", jobDescriptions);
            return reject("Invalid job descriptions input");
        }

        console.log("Job Descriptions being passed:", jobDescriptions);

        const scriptPath = path.resolve(__dirname, '../../ai-ml/skill_extraction/nlp_model.py');
        console.log("Python Script Path:", scriptPath);

        const pythonProcess = spawn('python', [scriptPath, JSON.stringify(jobDescriptions)]);

        let data = '';
        pythonProcess.stdout.on('data', (chunk) => {
            data += chunk.toString();
        });

        pythonProcess.stderr.on('data', (err) => {
            console.error(`Python Script Error: ${err}`);
        });

        pythonProcess.on('close', () => {
            try {
                if (!data.trim()) {
                    console.error("No output from Python script");
                    return reject("No output received from Python script");
                }

                const extractedSkills = JSON.parse(data.trim());
                console.log("Extracted Skills:", extractedSkills);
                resolve(extractedSkills);
            } catch (error) {
                console.error("Error parsing extracted skills:", error, "Raw output:", data);
                reject(error);
            }
        });
    });
}

// Run the content-based filtering Python script
function runContentFiltering(userSkills, jobDescriptions) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, '../../ai-ml/recommendation/content_based_filtering.py');
        const inputData = JSON.stringify({ user_skills: userSkills, job_descriptions: jobDescriptions });

        console.log("Running Content Filtering with:", inputData);  // Debug print
        const pythonProcess = spawn('python', [scriptPath, inputData]);

        let data = '';
        pythonProcess.stdout.on('data', (chunk) => {
            data += chunk.toString();
        });

        pythonProcess.stderr.on('data', (err) => {
            console.error(`Python Script Error: ${err}`);  // Debug print
        });

        pythonProcess.on('close', () => {
            try {
                if (!data.trim()) {
                    console.error("No output from content filtering script");
                    return reject("No output received from content filtering script");
                }

                console.log("Raw Python Script Output:", data);  // Debug print
                const result = JSON.parse(data.trim());
                console.log("Content Filtering Result:", result);  // Debug print
                resolve(result);
            } catch (error) {
                console.error("Error parsing content filtering output:", error, "Raw output:", data);
                reject(error);
            }
        });
    });
}

// Main function to calculate job recommendations
async function calculateJobRecommendations(userId) {
    try {
        const userSkills = await fetchUserSkills(userId);
        if (!userSkills.length) {
            console.error('No user skills found');
            return [];
        }

        const jobs = await Job.findAll();
        if (!jobs.length) {
            console.error('No jobs found in the database');
            return [];
        }

        // Extract job descriptions in the same order as the jobs
        const jobDescriptions = jobs.map(job => job.description || '');

        // Run content-based filtering
        const similarityResults = await runContentFiltering(userSkills, jobDescriptions);

        // Create a map of job descriptions to similarity scores
        const similarityMap = {};
        similarityResults.forEach((result) => {
            similarityMap[result.description] = result.similarity;
        });

        // Define a similarity threshold (e.g., 0.3)
        const SIMILARITY_THRESHOLD = 0.1;

        // Map jobs with similarity scores and filter by threshold
        const recommendedJobs = jobs
            .map((job) => ({
                id: job.id,
                title: job.title,
                description: job.description,
                company: job.company,
                jobImage: job.jobImage
                    ? `http://localhost:5000${job.jobImage}`
                    : `http://localhost:5000/uploads/placeholder-image.jpg`,
                similarity: similarityMap[job.description] || 0
            }))
            .filter(job => job.similarity >= SIMILARITY_THRESHOLD); // Filter by threshold

        // Sort jobs by similarity (descending order)
        recommendedJobs.sort((a, b) => b.similarity - a.similarity);

        return recommendedJobs;
    } catch (error) {
        console.error('Error in job recommendations:', error);
        return [];
    }
}

module.exports = { calculateJobRecommendations };
