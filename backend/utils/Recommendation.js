const { spawn } = require('child_process');
const Job = require('../models/Job');
const User = require('../models/User');
const path = require('path');

async function fetchUserProfile(userId) {
    try {
        const user = await User.findByPk(userId, {
            attributes: ['skills', 'profile']
        });
        
        return {
            skills: user?.skills || [],
            experience: user?.profile?.experience || '',
            education: user?.profile?.education || ''
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

async function getEnhancedRecommendations(userProfile, jobs) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, '../../ai-ml/recommendation/content_based_filtering.py');
        const inputData = JSON.stringify({
            user_profile: userProfile,
            jobs: jobs.map(job => ({
                id: job.id,
                description: job.description,
                title: job.title,
                company: job.company
            }))
        });

        console.log("\nSending to Python script:");
        console.log(`User Skills: ${userProfile.skills.join(', ')}`);
        console.log(`First Job Title: ${jobs[0]?.title || 'None'}`);

        const pythonProcess = spawn('python', [scriptPath, inputData]);

        let output = '';
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Python process exited with code ${code}`));
            }
            
            try {
                const result = JSON.parse(output);
                
                // Check for error in response
                if (result.error) {
                    console.error("\nPython Error Details:");
                    console.error(result.error);
                    if (result.traceback) {
                        console.error(result.traceback);
                    }
                    return reject(new Error("Python script encountered an error"));
                }
                
                // Log debug info if available
                if (result.debug) {
                    console.log("\nPython Debug Info:");
                    console.log(`User Skills: ${result.debug.user_skills.join(', ')}`);
                    console.log(`Sample Job Keywords: ${result.debug.sample_job_keywords.join(', ')}`);
                    console.log(`Vocabulary Size: ${result.debug.vectorizer_vocab_size}`);
                }
                
                // Return the results
                resolve(result.results);
            } catch (e) {
                console.error("\nFailed to parse Python output. Raw output:");
                console.error(output);
                reject(new Error(`Failed to parse Python output: ${e.message}`));
            }
        });
    });
}

async function calculateJobRecommendations(userId) {
    try {
        console.log("\n=== Starting Recommendation Process ===");
        
        // Get user profile data
        const userProfile = await fetchUserProfile(userId);
        if (!userProfile) {
            console.log("No user profile found");
            return [];
        }
        
        console.log("\nUser Profile:");
        console.log(`Skills: ${userProfile.skills.join(', ')}`);
        console.log(`Experience: ${userProfile.experience.substring(0, 50)}...`);
        console.log(`Education: ${userProfile.education.substring(0, 50)}...`);

        // Get all available jobs
        const jobs = await Job.findAll();
        if (!jobs.length) {
            console.log("No jobs found in database");
            return [];
        }

        // Get enhanced recommendations
        console.log("\nProcessing recommendations...");
        const recommendations = await getEnhancedRecommendations(userProfile, jobs);
        
        const SIMILARITY_THRESHOLD = 0.01;

        // Format and sort results
        const recommendedJobs = jobs
            .map(job => {
                const recommendation = recommendations.find(r => r.job_id === job.id);
                return {
                    id: job.id,
                    jobImage: formatImageUrl(job.jobImage),
                    title: job.title,
                    company: job.company,
                    similarity: recommendation?.score || 0,
                    matchDetails: recommendation?.details || {
                        skills: 0,
                        experience: 0,
                        education: 0
                    }
                };

                // Helper function to format image URLs
                function formatImageUrl(imagePath) {
                    if (!imagePath) {
                        return 'http://localhost:5000/uploads/default-job.png';
                    }
                    
                    // Check if already a full URL
                    if (imagePath.startsWith('http')) {
                        return imagePath;
                    }
                    
                    // Handle relative paths
                    return `http://localhost:5000${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
                }
            })
            .sort((a, b) => b.similarity - a.similarity);

        // Debug output
        console.log("\n=== Recommendation Scores ===");
        console.log(`Threshold: 0.01`);
        console.log("ID\tTitle\t\t\t\tSimilarity\tSkills\tExp\tEdu");
        console.log("--------------------------------------------------");
        
        recommendedJobs.forEach(job => {
            console.log(
                `${job.id}\t${job.title.substring(0, 20).padEnd(20)}\t` +
                `${job.similarity.toFixed(3)}\t\t` +
                `${job.matchDetails.skills.toFixed(3)}\t` +
                `${job.matchDetails.experience.toFixed(3)}\t` +
                `${job.matchDetails.education.toFixed(3)}`
            );
        });

        // Filter by threshold
        const filteredJobs = recommendedJobs.filter(job => job.similarity >= SIMILARITY_THRESHOLD);
        
        console.log(`\nFound ${filteredJobs.length} recommendations above threshold`);
        return filteredJobs;
            
    } catch (error) {
        console.error('\n!!! Recommendation error:', error);
        return [];
    }
}

module.exports = { calculateJobRecommendations };