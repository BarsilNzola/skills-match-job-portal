const { spawn } = require('child_process');
const path = require('path');
const supabase = require('./supabase');
const User = require('../models/User'); // Keep Sequelize for user data if needed

// Configuration
const SIMILARITY_THRESHOLD = 0.01;
const pythonPath = process.env.PYTHON_PATH || '/opt/venv/bin/python'; 

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
        console.log('Attempting Supabase connection...');
        
        // Simple test query first
        const test = await supabase.from('jobs').select('id').limit(1);
        if (test.error) throw test.error;
        
        // Main query
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select('id, title, company, location, description, url, source, createdAt')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return jobs || [];
        
    } catch (error) {
        console.error('Supabase Error Details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            stack: error.stack
        });
        throw new Error(`Supabase operation failed: ${error.message}`);
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

        console.log(`Executing: ${pythonPath} ${scriptPath}`);

        const child = spawn(pythonPath, [scriptPath]);

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', data => { stdout += data; });
        child.stderr.on('data', data => { stderr += data; });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error('[Recommendation] Python exited with code', code, stderr);
                return reject(new Error(`Python script failed with code ${code}`));
            }

            try {
                const result = JSON.parse(stdout.trim());
                if (result.error) {
                    return reject(new Error(result.error));
                }
                resolve(result.results || []);
            } catch (e) {
                console.error('[Recommendation] Failed to parse Python output:', stdout, stderr);
                reject(new Error('Invalid Python script output'));
            }
        });

        // Write the inputData to stdin
        child.stdin.write(JSON.stringify(inputData));
        child.stdin.end();
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