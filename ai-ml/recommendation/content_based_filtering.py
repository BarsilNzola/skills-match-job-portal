from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Content-based filtering function
def filterJobsBySkills(userSkills, jobDescriptions):
    # Vectorize the user's skills and the job descriptions
    vectorizer = CountVectorizer().fit_transform([userSkills] + jobDescriptions)
    vectors = vectorizer.toarray()

    # Compute cosine similarity between user skills and job descriptions
    cosine_sim = cosine_similarity(vectors)

    # We only need the first row, which contains the similarity between user's skills and each job description
    similarity_scores = cosine_sim[0]

    # Sort the job descriptions based on similarity score (highest first)
    sorted_jobs = sorted(zip(similarity_scores, jobDescriptions), reverse=True)
    
    return [job for _, job in sorted_jobs]
