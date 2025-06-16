import re
import pytesseract
from PIL import Image, ImageEnhance
import spacy
from spellchecker import SpellChecker
from typing import List, Dict
import cv2
import numpy as np
from io import BytesIO
import tempfile

# Initialize NLP tools
nlp = spacy.load("en_core_web_sm")
spell = SpellChecker()

def preprocess_image(image_data: bytes) -> Image.Image:
    """Enhanced image preprocessing for better OCR results - works with file buffers"""
    try:
        # Convert bytes to PIL Image
        img = Image.open(BytesIO(image_data))
        
        # Convert to grayscale
        img = img.convert('L')
        img_np = np.array(img)
        
        # Apply adaptive thresholding
        img_np = cv2.adaptiveThreshold(
            img_np, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Apply slight blur to reduce noise
        img_np = cv2.medianBlur(img_np, 1)
        
        # Convert back to PIL Image
        processed_img = Image.fromarray(img_np)
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(processed_img)
        processed_img = enhancer.enhance(2.0)
        
        return processed_img
        
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

def extract_text_from_image(img: Image.Image) -> str:
    """Perform OCR with optimized configuration using PIL Image directly"""
    try:
        # Custom configuration for job postings
        custom_config = r'''
            --psm 6
            -c preserve_interword_spaces=1
            -c tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.,/()&
        '''
        
        text = pytesseract.image_to_string(img, config=custom_config)
        return clean_text(text)
        
    except Exception as e:
        print(f'OCR failed: {e}')
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

def post_job_from_image(image_data: bytes) -> Dict:
    """Process job posting from image data with enhanced OCR"""
    try:
        # Process image directly from bytes
        processed_img = preprocess_image(image_data)
        raw_text = extract_text_from_image(processed_img)
        
        if not raw_text.strip():
            raise ValueError("OCR returned empty text")
        
        # Extract structured sections
        job_data = extract_job_sections(raw_text)
        
        # Extract skills from qualifications if available, otherwise from full text
        skill_source = job_data['qualifications'] if job_data['qualifications'] else job_data['description']
        job_data['skills'] = extract_skills(skill_source)
        
        # Remove local file system references
        if 'job_image' in job_data:
            del job_data['job_image']
        
        return job_data
        
    except Exception as e:
        print(f'Error processing job image: {e}')
        raise

# For command line usage (maintained for backward compatibility)
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python job_processor.py <image_path>")
        sys.exit(1)
    
    try:
        # Temporary fallback for file path usage
        with open(sys.argv[1], 'rb') as f:
            image_data = f.read()
        result = post_job_from_image(image_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)