import nltk
from nltk.tokenize import word_tokenize

# Download NLTK data for tokenization
nltk.download('punkt')

# List of skills to match
skills = ["JavaScript", "Python", "React", "Django", "Node.js", "Machine Learning"]

# Function to extract skills from a text
def extract_skills(text):
    words = word_tokenize(text.lower())  # Tokenize and convert to lower case
    extracted_skills = [skill for skill in skills if skill.lower() in words]
    return extracted_skills
