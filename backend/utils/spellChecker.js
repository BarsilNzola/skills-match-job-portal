const fs = require('fs');
const path = require('path');

class DictionarySpellChecker {
    constructor() {
        this.dictionary = new Set();
        this.loadDictionary();
    }

    loadDictionary() {
        try {
            const dictPath = path.join(__dirname, 'dictionary.txt');
            const words = fs.readFileSync(dictPath, 'utf8').split('\n');
            words.forEach(word => this.dictionary.add(word.trim().toLowerCase()));
            console.log(`Loaded ${this.dictionary.size} dictionary words`);
        } catch (error) {
            console.error('Could not load dictionary:', error);
        }
    }

    correctText(text) {
        if (!text || !this.dictionary.size) return text;

        return text.split(/(\W+)/).map(token => {
            if (!/\w{3,}/.test(token)) return token; // Skip short words/punctuation
            
            const lowerToken = token.toLowerCase();
            if (this.dictionary.has(lowerToken)) return token; // Already correct

            // Find closest match (simplified implementation)
            for (const dictWord of this.dictionary) {
                if (this.isCloseMatch(dictWord, lowerToken)) {
                    return this.matchCase(token, dictWord);
                }
            }
            
            return token; // Return original if no match found
        }).join('');
    }

    isCloseMatch(dictWord, inputWord) {
        // Basic similarity check (for demo - consider using Levenshtein distance)
        return dictWord.startsWith(inputWord.slice(0,3)) || 
               dictWord.endsWith(inputWord.slice(-3));
    }

    matchCase(original, correction) {
        if (original === original.toUpperCase()) {
            return correction.toUpperCase();
        } else if (original[0] === original[0]?.toUpperCase()) {
            return correction.charAt(0).toUpperCase() + correction.slice(1);
        }
        return correction;
    }
}

// Singleton instance
const spellChecker = new DictionarySpellChecker();

module.exports = {
    correctSpelling: (text) => spellChecker.correctText(text)
};