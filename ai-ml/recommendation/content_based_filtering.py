import sys
import json
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def extract_keywords(text):
    """Extract potential skills/qualifications from text"""
    keywords = set()
    # Simple pattern matching - enhance with your own rules
    patterns = {
        'education': r'(bachelor|bsc|master|msc|phd|degree|diploma)\s*(?:in|of)?\s*([a-z\s]+)',
        'experience': r'(\d+\+?\s*years?)\s*(?:of|experience)\s*(?:in|with)?\s*([a-z\s]+)',
        'skills': r'(proficient|experienced|skilled)\s*(?:in|with)?\s*([a-z\s]+)'
    }
    
    text = text.lower()
    for category, pattern in patterns.items():
        matches = re.finditer(pattern, text)
        for match in matches:
            keywords.add(match.group(2).strip())
    return list(keywords)

def calculate_scores(user_profile, jobs):
    # Prepare all text data
    all_texts = [
        user_profile['experience'],
        user_profile['education']
    ] + [job['description'] for job in jobs]
    
    # Create TF-IDF vectors
    vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
    vectors = vectorizer.fit_transform(all_texts)
    
    # Split vectors back apart
    user_exp_vec = vectors[0]
    user_edu_vec = vectors[1]
    job_vecs = vectors[2:]
    
    # Calculate similarities
    results = []
    for i, job in enumerate(jobs):
        job_vec = job_vecs[i]
        
        # Calculate individual similarities
        exp_sim = cosine_similarity(user_exp_vec, job_vec)[0][0]
        edu_sim = cosine_similarity(user_edu_vec, job_vec)[0][0]
        
        # Calculate skill match
        job_keywords = set(re.findall(r'\b[a-z]{3,}\b', job['description'].lower()))
        user_skills = set(skill.lower() for skill in user_profile['skills'])
        skill_match = len(job_keywords & user_skills) / len(job_keywords) if job_keywords else 0
        
        # Combined score
        combined_score = 0.4 * exp_sim + 0.3 * edu_sim + 0.3 * skill_match
        
        results.append({
            'job_id': job['id'],
            'score': float(combined_score),
            'details': {
                'skills': float(skill_match),
                'experience': float(exp_sim),
                'education': float(edu_sim)
            }
        })
    
    # Create debug output that won't interfere with JSON
    debug_info = {
        'debug': {
            'user_skills': list(user_skills),
            'sample_job_keywords': list(job_keywords)[:10] if job_keywords else [],
            'vectorizer_vocab_size': len(vectorizer.vocabulary_)
        },
        'results': results
    }
    
    return debug_info

if __name__ == "__main__":
    input_data = json.loads(sys.stdin.read())  # <- read from stdin
    user_profile = input_data['user_profile']
    jobs = input_data['jobs']
    output = calculate_scores(user_profile, jobs)
    print(json.dumps(output))