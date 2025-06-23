const { spawn } = require('child_process');
const path = require('path');
const Job = require('../models/Job');
const User = require('../models/User');
const { supabase } = require('../utils/supabase');

// Configuration
const SIMILARITY_THRESHOLD = 0.01;

/**
 * Fetches enhanced user profile data for recommendations
 * @param {number} userId - The user ID to fetch profile for
 * @returns {Promise<Object>} User profile data
 */
async function fetchUserProfile(userId) {
    try {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'skills', 'profile'],
            raw: true
        });
        
        if (!user) {
            console.warn(`User ${userId} not found`);
            return null;
        }

        return {
            id: user.id,
            skills: user.skills || [],
            experience: user.profile?.experience || '',
            education: user.profile?.education || '',
            projects: user.profile?.projects || []
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw new Error('Failed to fetch user profile');
    }
}

/**
 * Gets all active jobs from database
 * @returns {Promise<Array>} List of jobs
 */
async function fetchAllJobs() {
    try {
        const jobs = await Job.findAll({
            attributes: ['id', 'title', 'company', 'description', 'url'],
            where: { status: 'active' }, // Only active jobs
            raw: true
        });
        
        if (!jobs.length) {
            console.warn('No active jobs found in database');
            return [];
        }

        return jobs.map(job => ({
            ...job,
            // Format image URL for Supabase
            jobImage: job.jobImage ? getSupabaseImageUrl(job.jobImage) : DEFAULT_JOB_IMAGE
        }));
    } catch (error) {
        console.error('Error fetching jobs:', error);
        throw new Error('Failed to fetch jobs');
    }
}

/**
 * Executes Python recommendation script
 * @param {Object} userProfile - User profile data
 * @param {Array} jobs - List of jobs
 * @returns {Promise<Array>} Recommendation results
 */
async function getEnhancedRecommendations(userProfile, jobs) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, '../../ai-ml/recommendation/content_based_filtering.py');
        
        const inputData = {
            user_profile: {
                ...userProfile,
                // Add timestamp for debugging
                request_time: new Date().toISOString()
            },
            jobs: jobs.map(job => ({
                id: job.id,
                title: job.title,
                company: job.company,
                description: job.description
            }))
        };

        console.log('\n[Recommendation] Starting process with:');
        console.log(`- User ID: ${userProfile.id}`);
        console.log(`- User Skills: ${userProfile.skills.slice(0, 5).join(', ')}${userProfile.skills.length > 5 ? '...' : ''}`);
        console.log(`- Jobs to analyze: ${jobs.length}`);

        const pythonProcess = spawn('python', [
            scriptPath, 
            JSON.stringify(inputData)
        ]);

        let output = '';
        let errorOutput = '';

        // Set timeout for Python process (5 minutes)
        const timeout = setTimeout(() => {
            pythonProcess.kill();
            reject(new Error('Python process timed out after 5 minutes'));
        }, 300000);

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            clearTimeout(timeout);
            
            if (code !== 0) {
                console.error(`[Recommendation] Python process exited with code ${code}`);
                console.error('Error output:', errorOutput);
                return reject(new Error('Python script execution failed'));
            }
            
            try {
                const result = JSON.parse(output);
                
                if (result.error) {
                    console.error('[Recommendation] Python error:', result.error);
                    if (result.traceback) {
                        console.error(result.traceback);
                    }
                    return reject(new Error(result.error));
                }

                console.log(`[Recommendation] Successfully processed ${result.results?.length || 0} jobs`);
                resolve(result.results || []);
            } catch (e) {
                console.error('[Recommendation] Failed to parse Python output:', e);
                console.error('Raw output:', output);
                reject(new Error('Invalid Python script output'));
            }
        });
    });
}

/**
 * Formats and filters recommendation results
 * @param {Array} jobs - Original job data
 * @param {Array} recommendations - Raw recommendations from Python
 * @returns {Array} Formatted and filtered recommendations
 */
function formatRecommendations(jobs, recommendations) {
    const jobMap = jobs.reduce((acc, job) => {
        acc[job.id] = job;
        return acc;
    }, {});

    return recommendations
        .map(rec => {
            const job = jobMap[rec.job_id];
            if (!job) return null;

            return {
                ...job,
                similarity: rec.score || 0,
                matchDetails: {
                    skills: rec.details?.skills || 0,
                    experience: rec.details?.experience || 0,
                    education: rec.details?.education || 0
                }
            };
        })
        .filter(Boolean) // Remove null entries
        .sort((a, b) => b.similarity - a.similarity)
        .filter(job => job.similarity >= SIMILARITY_THRESHOLD);
}

/**
 * Main recommendation function
 * @param {number} userId - User ID to get recommendations for
 * @returns {Promise<Array>} Recommended jobs
 */
async function calculateJobRecommendations(userId) {
    try {
        console.log(`\n[Recommendation] Starting for user ${userId}`);
        
        // 1. Fetch user profile
        const userProfile = await fetchUserProfile(userId);
        if (!userProfile) {
            console.log('[Recommendation] No user profile - returning empty results');
            return [];
        }

        // 2. Fetch active jobs
        const jobs = await fetchAllJobs();
        if (!jobs.length) {
            console.log('[Recommendation] No jobs available - returning empty results');
            return [];
        }

        // 3. Get recommendations from Python
        const recommendations = await getEnhancedRecommendations(userProfile, jobs);
        
        // 4. Format and filter results
        const formattedResults = formatRecommendations(jobs, recommendations);

        // Debug output
        console.log('\n[Recommendation] Top 5 recommendations:');
        formattedResults.slice(0, 5).forEach((job, i) => {
            console.log(`${i + 1}. ${job.title} (${job.company}) - Score: ${job.similarity.toFixed(3)}`);
        });
        console.log(`[Recommendation] Total recommendations: ${formattedResults.length}`);

        return formattedResults;
    } catch (error) {
        console.error('[Recommendation] Error in calculateJobRecommendations:', error);
        return []; // Return empty array on error
    }
}

module.exports = {
    calculateJobRecommendations,
    // Export for testing
    _test: {
        fetchUserProfile,
        fetchAllJobs,
        formatRecommendations
    }
};