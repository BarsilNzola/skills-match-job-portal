const { CountVectorizer } = require('simple-statistics');

// Helper function to vectorize text
function vectorizeText(textArray) {
    const vectorizer = new CountVectorizer();
    return vectorizer.fitTransform(textArray);
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vectors) {
    const numVectors = vectors.length;
    const similarityMatrix = Array.from({ length: numVectors }, () =>
        Array(numVectors).fill(0)
    );

    for (let i = 0; i < numVectors; i++) {
        for (let j = 0; j < numVectors; j++) {
            const dotProduct = vectors[i].reduce((sum, val, index) => sum + val * vectors[j][index], 0);
            const magnitudeA = Math.sqrt(vectors[i].reduce((sum, val) => sum + val ** 2, 0));
            const magnitudeB = Math.sqrt(vectors[j].reduce((sum, val) => sum + val ** 2, 0));
            similarityMatrix[i][j] = dotProduct / (magnitudeA * magnitudeB);
        }
    }
    return similarityMatrix;
}

module.exports = { vectorizeText, cosineSimilarity };
