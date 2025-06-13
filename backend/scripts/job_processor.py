import os
from pathlib import Path
import re
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import spacy
import pandas as pd
from spellchecker import SpellChecker
from typing import List, Dict
import tempfile
import cv2
import numpy as np

# Initialize NLP tools
nlp = spacy.load("en_core_web_sm")
spell = SpellChecker()

# Define paths
current_script_dir = Path(__file__).parent
skills_base_path = current_script_dir.parent / "utils" / "skill_data"

def preprocess_image(image_path: str) -> str:
    """Enhanced image preprocessing for better OCR results"""
    try:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        # Create temp file for processed image
        temp_dir = tempfile.gettempdir()
        processed_path = os.path.join(temp_dir, f"processed_{os.path.basename(image_path)}")
        
        # Open image and convert to numpy array for OpenCV processing
        with Image.open(image_path) as img:
            img = img.convert('L')  # Convert to grayscale
            img_np = np.array(img)
            
            # Apply adaptive thresholding
            img_np = cv2.adaptiveThreshold(
                img_np, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Apply slight blur to reduce noise
            img_np = cv2.medianBlur(img_np, 1)
            
            # Convert back to PIL Image
            img = Image.fromarray(img_np)
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(2.0)
            
            # Save processed image
            img.save(processed_path)
            
        return processed_path
        
    except Exception as e:
        print(f'Image preprocessing failed: {e}')
        raise

def clean_text(raw_text: str) -> str:
    """General text cleaning for OCR output"""
    # Remove non-ASCII except basic punctuation and symbols
    cleaned = re.sub(r'[^\x20-\x7E\n\r]', '', raw_text)
    
    # Fix common OCR artifacts
    cleaned = re.sub(r'(\w)\s+(\w)', r'\1\2', cleaned)  # Remove spaces within words
    cleaned = re.sub(r'([a-z])([A-Z])', r'\1 \2', cleaned)  # Add space between lower and uppercase
    
    # Standardize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned)  # Collapse multiple spaces
    cleaned = re.sub(r'\n{2,}', '\n', cleaned)  # Collapse multiple newlines
    
    return cleaned.strip()

def extract_text_from_image(file_path: str) -> str:
    """Perform OCR with optimized configuration"""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        # Custom configuration for job postings
        custom_config = r'''
            --psm 6
            -c preserve_interword_spaces=1
            -c tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.,/()&
        '''
        
        text = pytesseract.image_to_string(
            Image.open(file_path),
            config=custom_config
        )
        
        return clean_text(text)
        
    except Exception as e:
        print(f'OCR failed for {os.path.basename(file_path)}: {e}')
        raise

def extract_job_sections(text: str) -> Dict[str, str]:
    """Extract job sections using flexible pattern matching"""
    # Normalize text
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Initialize sections
    sections = {
        'title': 'Unknown Position',
        'company': 'Unknown Company',
        'qualifications': '',
        'description': text
    }
    
    # Try to extract title (looking for ALL-CAPS lines or position keywords)
    title_match = re.search(
        r'(?:\n|^)([A-Z][A-Z\s]+(?:DEVELOPER|ENGINEER|ANALYST|SPECIALIST|MANAGER))\b',
        text
    )
    if title_match:
        sections['title'] = title_match.group(1).strip()
    
    # Try to extract company (text before position or "Join" keyword)
    company_match = re.search(
        r'(?:^|\n)([A-Z][A-Za-z\s&]+)\s*(?:Join|Looking|Hiring|is hiring)',
        text, re.IGNORECASE
    )
    if company_match:
        sections['company'] = company_match.group(1).strip()
    
    # Try to extract qualifications section
    qual_match = re.search(
        r'(?:Qualifications?|Requirements?|Skills?|Experience):?\s*(.+?)(?:\n\n|$|http|www\.)',
        text, re.IGNORECASE | re.DOTALL
    )
    if qual_match:
        sections['qualifications'] = qual_match.group(1).strip()
    
    return sections

def load_skills_databases() -> List[str]:
    """Load both ESCO and O*NET skills databases"""
    esco_path = skills_base_path / "esco" / "skills_en.csv"
    onet_path = skills_base_path / "onet" / "Skills.txt"
    
    skills = set()
    
    try:
        # Load ESCO skills
        if esco_path.exists():
            esco_skills = pd.read_csv(esco_path)
            skills.update(esco_skills['preferredLabel'].str.lower().dropna().tolist())
        
        # Load O*NET skills
        if onet_path.exists():
            onet_skills = pd.read_csv(onet_path, sep='\t')
            skills.update(onet_skills['Element Name'].str.lower().dropna().tolist())
    except Exception as e:
        print(f"Error loading skills databases: {e}")
    
    return list(skills)

def extract_skills(text: str) -> List[str]:
    """Extract skills from text using NLP and skills databases"""
    if not hasattr(extract_skills, 'skills_db'):
        extract_skills.skills_db = load_skills_databases()
    
    doc = nlp(text.lower())
    found_skills = set()
    
    # Check for exact matches in skills database
    for skill in extract_skills.skills_db:
        if skill in text.lower():
            found_skills.add(skill)
    
    # Check for token matches
    for token in doc:
        if not token.is_stop and len(token.text) > 2:
            if token.text in extract_skills.skills_db:
                found_skills.add(token.text)
    
    return sorted(found_skills)

def post_job_from_image(image_path: str) -> Dict:
    """Process job posting from image with enhanced OCR"""
    processed_path = None
    try:
        processed_path = preprocess_image(image_path)
        raw_text = extract_text_from_image(processed_path)
        
        if not raw_text.strip():
            raise ValueError("OCR returned empty text")
        
        # Extract structured sections
        job_data = extract_job_sections(raw_text)
        
        # Extract skills from qualifications if available, otherwise from full text
        skill_source = job_data['qualifications'] if job_data['qualifications'] else job_data['description']
        job_data['skills'] = extract_skills(skill_source)
        
        # Add image path
        job_data['job_image'] = f'/uploads/{os.path.basename(image_path)}'
        
        return job_data
        
    finally:
        if processed_path and os.path.exists(processed_path):
            os.remove(processed_path)