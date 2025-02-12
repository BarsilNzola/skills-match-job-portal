const natural = require('natural');

// Function to convert text into numerical vectors
function vectorizeText(textArray) {
    const tfidf = new natural.TfIdf();
    
    // Add all documents to TF-IDF
    textArray.forEach(doc => tfidf.addDocument(doc));

    // Generate vectors correctly for each document
    return textArray.map((doc, index) => {
        const vector = [];
        tfidf.listTerms(index).forEach(term => {
            vector.push(tfidf.tfidf(term.term, index)); // Use `index` instead of `0`
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
