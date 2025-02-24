import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer
import json

# Download necessary resources
nltk.download('punkt')
nltk.download('stopwords')

stop_words = set(stopwords.words('english'))

def extract_skills(job_descriptions):
    try:
        descriptions = [job.get('description', '') for job in job_descriptions]

        # Tokenize and filter stopwords
        all_words = [word_tokenize(desc.lower()) for desc in descriptions]
        filtered_words = [word for sublist in all_words for word in sublist if word.isalpha() and word not in stop_words]

        # Extract most common words (potential skills)
        vectorizer = CountVectorizer().fit([" ".join(filtered_words)])
        skills = vectorizer.get_feature_names_out()

        return skills.tolist()

    except Exception as e:
        return {"error": f"Skill extraction failed: {str(e)}"}

if __name__ == "__main__":
    import sys
    try:
        job_descriptions = json.loads(sys.argv[1])
        extracted_skills = extract_skills(job_descriptions)
        print(json.dumps(extracted_skills))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"JSON decode error: {str(e)}"}))
