const { cosineSimilarity, vectorizeText } = require('./TextSimilarity'); // Import helper functions

function calculateJobRecommendations(userSkills, jobs) {
    const jobDescriptions = jobs.map(job => job.description); // Extract job descriptions
    const vectors = vectorizeText([userSkills, ...jobDescriptions]); // Vectorize user skills and job descriptions

    // Calculate cosine similarity scores
    const similarityScores = cosineSimilarity(vectors);

    // Match jobs with similarity scores and sort them
    const recommendedJobs = jobs.map((job, index) => ({
        ...job,
        similarity: similarityScores[0][index + 1] // First row, skip userSkills itself
    })).sort((a, b) => b.similarity - a.similarity);

    return recommendedJobs;
}

module.exports = { calculateJobRecommendations };
