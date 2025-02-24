const natural = require('natural');

// Function to convert text into numerical vectors
function vectorizeText(textArray) {
    const tfidf = new natural.TfIdf();

    // Add all documents to TF-IDF
    textArray.forEach(doc => tfidf.addDocument(doc));

    // Generate vectors with consistent length
    const vocabulary = new Set();
    textArray.forEach(doc => {
        const terms = new natural.WordTokenizer().tokenize(doc);
        terms.forEach(term => vocabulary.add(term));
    });

    return textArray.map((doc, index) => {
        const vector = Array.from(vocabulary).map(term => tfidf.tfidf(term, index));
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