const { exec } = require('child_process');
const path = require('path');
const { supabase } = require('../utils/supabase');
const User = require('../models/User'); // Keep Sequelize for user data if needed

// Configuration
const SIMILARITY_THRESHOLD = 0.01;
const pythonPath = process.env.PYTHON_PATH || 'python'; // Default to 'python' if not set

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
 * Gets all active jobs from Supabase
 * @returns {Promise<Array>} List of jobs
 */
async function fetchAllJobs() {
    try {
        console.log('Fetching jobs from Supabase...');
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select('id, title, company, location, description, url, source, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        if (!jobs || jobs.length === 0) {
            console.warn('No active jobs found in Supabase');
            return [];
        }

        console.log(`Found ${jobs.length} jobs in Supabase`);
        return jobs.map(job => ({
            ...job,
            createdAt: job.created_at // Normalize field name
        }));
    } catch (error) {
        console.error('Supabase error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        throw new Error('Failed to fetch jobs from Supabase');
    }
}

/**
 * Executes Python recommendation script with proper error handling
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
                request_time: new Date().toISOString()
            },
            jobs: jobs.map(job => ({
                id: job.id,
                title: job.title,
                company: job.company,
                description: job.description,
                url: job.url,
                source: job.source
            }))
        };

        console.log('\n[Recommendation] Starting Python process with:');
        console.log(`- Python Path: ${pythonPath}`);
        console.log(`- Script Path: ${scriptPath}`);
        console.log(`- User Skills: ${userProfile.skills.slice(0, 5).join(', ')}${userProfile.skills.length > 5 ? '...' : ''}`);
        console.log(`- Jobs to analyze: ${jobs.length}`);

        const command = `${pythonPath} "${scriptPath}" '${JSON.stringify(inputData)}'`;
        console.log(`Executing: ${command}`);

        exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                console.error('[Recommendation] Python execution failed:', {
                    error: error.message,
                    stderr: stderr.toString(),
                    stdout: stdout.toString()
                });
                return reject(new Error('Python script execution failed'));
            }

            if (stderr) {
                console.warn('[Recommendation] Python stderr:', stderr.toString());
            }

            try {
                const result = JSON.parse(stdout);
                
                if (result.error) {
                    console.error('[Recommendation] Python script error:', result.error);
                    if (result.traceback) {
                        console.error(result.traceback);
                    }
                    return reject(new Error(result.error || 'Python script returned error'));
                }

                console.log(`[Recommendation] Successfully processed ${result.results?.length || 0} jobs`);
                resolve(result.results || []);
            } catch (e) {
                console.error('[Recommendation] Failed to parse Python output:', {
                    error: e.message,
                    rawOutput: stdout
                });
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
            if (!job) {
                console.warn(`Job ${rec.job_id} from Python not found in database`);
                return null;
            }

            return {
                ...job,
                similarity: rec.score || 0,
                matchDetails: {
                    skills: rec.details?.skills || 0,
                    experience: rec.details?.experience || 0,
                    education: rec.details?.education || 0,
                    matchedSkills: rec.details?.matchedSkills || []
                }
            };
        })
        .filter(Boolean)
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
        console.log(`\n[Recommendation] Starting recommendation process for user ${userId}`);
        
        // 1. Fetch user profile
        const userProfile = await fetchUserProfile(userId);
        if (!userProfile) {
            console.log('[Recommendation] No user profile - returning empty results');
            return [];
        }

        if (!userProfile.skills || userProfile.skills.length === 0) {
            console.log('[Recommendation] User has no skills - returning empty results');
            return [];
        }

        // 2. Fetch active jobs from Supabase
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
        console.log('\n[Recommendation] Recommendation results:');
        if (formattedResults.length > 0) {
            console.log(`Top 5 recommendations:`);
            formattedResults.slice(0, 5).forEach((job, i) => {
                console.log(`${i + 1}. ${job.title} (${job.company}) - Score: ${job.similarity.toFixed(3)}`);
                console.log(`   Matching Skills: ${job.matchDetails.matchedSkills.slice(0, 3).join(', ')}${job.matchDetails.matchedSkills.length > 3 ? '...' : ''}`);
            });
        }
        console.log(`Total recommendations: ${formattedResults.length}`);

        return formattedResults;
    } catch (error) {
        console.error('[Recommendation] Error in calculateJobRecommendations:', {
            error: error.message,
            stack: error.stack
        });
        return []; // Return empty array on error
    }
}

module.exports = {
    calculateJobRecommendations,
    // Export for testing
    _test: {
        fetchUserProfile,
        fetchAllJobs,
        formatRecommendations,
        getEnhancedRecommendations
    }
};