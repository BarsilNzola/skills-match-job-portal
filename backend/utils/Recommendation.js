const { cosineSimilarity, vectorizeText } = require('./TextSimilarity'); // Import helper functions

function calculateJobRecommendations(userSkills, jobs) {
    console.log('User Skills:', userSkills);  // Debugging
    
    if (!userSkills || userSkills.length === 0) {
        console.error('User skills are empty or not provided');
        return [];
    }

    const jobDescriptions = jobs.map(job => job.description || ''); // Ensure no null descriptions
    console.log('Job Descriptions:', jobDescriptions);  // Debugging

    // Ensure userSkills is a string
    const textData = [userSkills.toString(), ...jobDescriptions];
    console.log('Text Data for Vectorization:', textData);  // Debugging

    try {
        const vectors = vectorizeText(textData);  // Convert text to vectors
        console.log('Generated Vectors:', vectors);  // Debugging

        // Calculate cosine similarity
        const similarityScores = cosineSimilarity(vectors);
        console.log('Similarity Scores:', similarityScores);  // Debugging

        // Ensure similarityScores has the correct shape
        if (!similarityScores || similarityScores.length === 0 || !similarityScores[0]) {
            console.error('Invalid similarity scores computed');
            return [];
        }

        // Match jobs with similarity scores and sort
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
