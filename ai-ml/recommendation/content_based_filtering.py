# Simple content-based filtering using cosine similarity
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# Example user and job profiles
user_skills = "JavaScript React Machine Learning"
job_descriptions = [
    "Looking for a developer skilled in JavaScript and React",
    "Data Scientist with experience in Machine Learning and Python",
    "Frontend Developer with expertise in React and CSS"
]

# Vectorize the skills and job descriptions
vectorizer = CountVectorizer().fit_transform([user_skills] + job_descriptions)
vectors = vectorizer.toarray()

# Compute cosine similarity
cosine_sim = cosine_similarity(vectors)
print(cosine_sim)
