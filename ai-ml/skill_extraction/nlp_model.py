# Simplified example using spaCy for skill extraction
import spacy
import json

nlp = spacy.load("en_core_web_sm")
skills = ["JavaScript", "Python", "React", "Django", "Node.js", "Machine Learning"]

def extract_skills(text):
    doc = nlp(text)
    extracted_skills = [skill for skill in skills if skill.lower() in text.lower()]
    return extracted_skills

# Example usage
text = "I have experience in JavaScript, React, and Machine Learning."
print(extract_skills(text))
