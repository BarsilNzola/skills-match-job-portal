const { cosineSimilarity, vectorizeText } = require('./TextSimilarity'); // Import helper functions
const { spawn } = require('child_process');

// Extract skills from job descriptions using Python AI-ML model
function extractSkillsFromJobs(jobDescriptions) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', ['ai-ml/nlp_model.py', JSON.stringify(jobDescriptions)]);

        let data = '';
        pythonProcess.stdout.on('data', (chunk) => {
            data += chunk.toString();
        });

        pythonProcess.stderr.on('data', (err) => {
            console.error(`Error in NLP model: ${err}`);
        });

        pythonProcess.on('close', () => {
            try {
                resolve(JSON.parse(data));  // Ensure parsed JSON
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function calculateJobRecommendations(userSkills, jobs) {
    console.log('User Skills:', userSkills);  // Debugging

    if (!userSkills || userSkills.length === 0) {
        console.error('User skills are empty or not provided');
        return [];
    }

    // Ensure correct column name
    const jobDescriptions = jobs.map(job => job.description || '');
    console.log('Job Descriptions:', jobDescriptions);  // Debugging

    // Extract skills from job descriptions dynamically
    const extractedSkills = await extractSkillsFromJobs(jobDescriptions);
    console.log('Extracted Skills from Jobs:', extractedSkills);  // Debugging

    // Convert user skills to a string for vectorization
    const textData = [userSkills.toString(), ...jobDescriptions];
    console.log('Text Data for Vectorization:', textData);  // Debugging

    try {
        const vectors = vectorizeText(textData);  // Convert text to vectors
        console.log('Generated Vectors:', vectors);  // Debugging

        // Calculate cosine similarity
        const similarityScores = cosineSimilarity(vectors);
        console.log('Similarity Scores:', similarityScores);  // Debugging

        if (!similarityScores || similarityScores.length === 0 || !similarityScores[0]) {
            console.error('Invalid similarity scores computed');
            return [];
        }

        // Match jobs with similarity scores and sort by relevance
        const recommendedJobs = jobs.map((job, index) => ({
            ...job,
            similarity: similarityScores[0][index + 1] || 0 // Handle out-of-bounds error
        })).sort((a, b) => b.similarity - a.similarity);

        console.log('Recommended Jobs:', recommendedJobs);  // Debugging
        return recommendedJobs;
    } catch (error) {
        console.error('Error in job recommendations:', error);
        return [];
    }
}

module.exports = { calculateJobRecommendations };
