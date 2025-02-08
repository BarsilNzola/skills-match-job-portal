const natural = require('natural');

// Function to convert text into numerical vectors
function vectorizeText(textArray) {
    const tfidf = new natural.TfIdf();
    
    textArray.forEach(doc => tfidf.addDocument(doc));
    
    return textArray.map(doc => {
        const vector = [];
        tfidf.listTerms(0).forEach(term => {
            vector.push(tfidf.tfidf(term.term, doc));
        });
        return vector;
    });
}

// Function to calculate cosine similarity
function cosineSimilarity(vectors) {
    function dotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }
    
    function magnitude(vec) {
        return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    }
    
    const similarityMatrix = [];
    for (let i = 0; i < vectors.length; i++) {
        similarityMatrix[i] = [];
        for (let j = 0; j < vectors.length; j++) {
            similarityMatrix[i][j] = dotProduct(vectors[i], vectors[j]) / (magnitude(vectors[i]) * magnitude(vectors[j]) || 1);
        }
    }
    
    return similarityMatrix;
}

module.exports = { vectorizeText, cosineSimilarity };
