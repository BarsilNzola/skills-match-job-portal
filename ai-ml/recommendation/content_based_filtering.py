from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import sys
import json

def filterJobsBySkills(userSkills, jobDescriptions):
    # Debug logs to stderr
    print("User Skills:", userSkills, file=sys.stderr)
    print("Job Descriptions:", jobDescriptions, file=sys.stderr)

    # Ensure inputs are valid
    if not isinstance(userSkills, list) or not isinstance(jobDescriptions, list):
        raise ValueError("userSkills and jobDescriptions must be lists")

    # Convert user skills into a single string
    user_skills_text = " ".join(userSkills)

    # Combine user skills and job descriptions for vectorization
    texts = [user_skills_text] + jobDescriptions

    # Vectorize the texts
    vectorizer = CountVectorizer().fit_transform(texts)
    vectors = vectorizer.toarray()

    # Compute cosine similarity between user skills and each job description
    cosine_sim = cosine_similarity(vectors)

    # Extract similarity scores (first row contains similarity between user skills and each job description)
    similarity_scores = cosine_sim[0][1:]  # Skip the first element (similarity of user skills with itself)

    # Pair each job description with its similarity score
    scored_jobs = list(zip(similarity_scores, jobDescriptions))

    # Sort jobs by similarity score (descending order)
    sorted_jobs = sorted(scored_jobs, key=lambda x: x[0], reverse=True)

    # Return sorted jobs with their similarity scores
    return [{"description": job, "similarity": float(score)} for score, job in sorted_jobs]

if __name__ == "__main__":
    try:
        raw_input_data = sys.argv[1] if len(sys.argv) > 1 else '{}'
        print(f"Raw Input Data: {raw_input_data}", file=sys.stderr)

        input_data = json.loads(raw_input_data)
        print(f"Parsed Input Data: {input_data}", file=sys.stderr)

        user_skills = input_data.get('user_skills', [])
        job_descriptions = input_data.get('job_descriptions', [])

        if not user_skills or not job_descriptions:
            raise ValueError("Invalid input data. Expected non-empty user skills and job descriptions.")

        result = filterJobsBySkills(user_skills, job_descriptions)
        # Print only the JSON result to stdout
        print(json.dumps(result))

    except json.JSONDecodeError as json_error:
        print(json.dumps({"error": f"JSON decode error: {str(json_error)}"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))