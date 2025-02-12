import sys
import json
import nltk
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import CountVectorizer

# Ensure necessary NLTK data is downloaded
nltk.download('punkt')

# Function to extract skills dynamically from job descriptions
def extract_skills(job_descriptions):
    # Tokenize words from all job descriptions
    all_words = [word_tokenize(desc.lower()) for desc in job_descriptions if desc]  # Ensure no null descriptions
    flattened_words = [word for sublist in all_words for word in sublist]  # Flatten list

    # Use CountVectorizer to identify most common words (potential skills)
    vectorizer = CountVectorizer().fit([" ".join(flattened_words)])  # Convert list back to string
    skills = vectorizer.get_feature_names_out().tolist()

    return skills

if __name__ == "__main__":
    try:
        # Read job descriptions from command-line argument
        job_data = json.loads(sys.argv[1])

        # Extract only 'description' field from jobs
        job_descriptions = [job.get("description", "") for job in job_data]

        extracted_skills = extract_skills(job_descriptions)

        # Output extracted skills as JSON
        print(json.dumps(extracted_skills))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
