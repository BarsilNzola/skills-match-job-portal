import re
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import spacy
from spellchecker import SpellChecker
from typing import List, Dict
import cv2
import numpy as np
from io import BytesIO
import tempfile
import os
import csv
import sys
import json
from spacy.matcher import PhraseMatcher

# Initialize NLP tools
nlp = spacy.load("en_core_web_sm")
spell = SpellChecker()

# -----------------------------
# Skill Extraction Setup
# -----------------------------
skills_database = set()

def load_skills_from_files():
    """Load and normalize skills into the global skill set."""
    base_dir = os.path.join(os.path.dirname(__file__), '../utils/skill_data')

    try:
        with open(os.path.join(base_dir, 'esco/skills_en.csv'), encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                label = row.get('preferredLabel')
                if label:
                    skill = label.strip().lower()
                    if skill:
                        skills_database.add(skill)
    except Exception as e:
        print(f"Error loading ESCO skills: {e}")

    try:
        with open(os.path.join(base_dir, 'onet/Skills.txt'), encoding='utf-8') as f:
            for line in f:
                skill = line.strip().lower()
                if skill:
                    skills_database.add(skill)
    except Exception as e:
        print(f"Error loading O*NET skills: {e}")

def extract_skills(text: str) -> list:
    """Extract relevant skills from job description using phrase matching."""
    if not text:
        return []

    doc = nlp(text.lower())
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

    # Only keep unique lowercase skill phrases
    patterns = [nlp.make_doc(skill) for skill in sorted(set(skills_database))]
    matcher.add("SKILLS", patterns)

    matches = matcher(doc)

    found_skills = set()
    for match_id, start, end in matches:
        span = doc[start:end]
        found_skills.add(span.text.lower())

    return sorted(found_skills)

# -----------------------------
# OCR & Text Processing
# -----------------------------

def preprocess_image(image_data: bytes) -> Image.Image:
    """Enhanced image preprocessing for better OCR results"""
    try:
        img = Image.open(BytesIO(image_data))
        img = img.convert('L')  # grayscale

        # Resize image to fixed width (Option 2)
        base_width = 1800
        w_percent = base_width / float(img.size[0])
        h_size = int((float(img.size[1]) * float(w_percent)))
        img = img.resize((base_width, h_size), Image.Resampling.LANCZOS)

        # Convert to NumPy for OpenCV processing
        img_np = np.array(img)

        # Apply adaptive thresholding
        img_np = cv2.adaptiveThreshold(
            img_np, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        # Apply median blur
        img_np = cv2.medianBlur(img_np, 1)

        # Convert back to PIL and enhance contrast
        processed_img = Image.fromarray(img_np)
        enhancer = ImageEnhance.Contrast(processed_img)
        return enhancer.enhance(2.0)

    except Exception as e:
        print(f'Image preprocessing failed: {e}')
        raise

def basic_preprocess_image(image_data: bytes) -> Image.Image:
    try:
        img = Image.open(BytesIO(image_data)).convert('L')
        enhancer = ImageEnhance.Contrast(img)
        return enhancer.enhance(1.8)
    except Exception as e:
        print(f'Basic preprocessing failed: {e}', file=sys.stderr)
        raise


def clean_text(raw_text: str) -> str:
    cleaned = re.sub(r'[^\x20-\x7E\n\r]', '', raw_text)
    cleaned = re.sub(r'(\w)\s+(\w)', r'\1\2', cleaned)
    cleaned = re.sub(r'([a-z])([A-Z])', r'\1 \2', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = re.sub(r'\n{2,}', '\n', cleaned)
    return cleaned.strip()

def extract_text_from_image(img: Image.Image) -> str:
    try:
        custom_config = r'''
            --psm 4
            -c preserve_interword_spaces=1
            -c tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.,/()&
        '''
        text = pytesseract.image_to_string(img, config=custom_config)
        return clean_text(text)
    except Exception as e:
        print(f'OCR failed: {e}')
        raise


# -----------------------------
# Job Info Extraction
# -----------------------------

def extract_job_sections(text: str) -> Dict[str, str]:
    text = re.sub(r'\s+', ' ', text).strip()

    sections = {
        'title': 'Unknown Position',
        'company': 'Unknown Company',
        'qualifications': '',
        'description': text
    }

    title_match = re.search(
        r'(?:\n|^)([A-Z][A-Z\s]+(?:DEVELOPER|ENGINEER|ANALYST|SPECIALIST|MANAGER))\b',
        text
    )
    if title_match:
        sections['title'] = title_match.group(1).strip()

    company_match = re.search(
        r'(?:^|\n)([A-Z][A-Za-z\s&]+)\s*(?:Join|Looking|Hiring|is hiring)',
        text, re.IGNORECASE
    )
    if company_match:
        sections['company'] = company_match.group(1).strip()

    qual_match = re.search(
        r'(?:Qualifications?|Requirements?|Skills?|Experience):?\s*(.+?)(?:\n\n|$|http|www\.)',
        text, re.IGNORECASE | re.DOTALL
    )
    if qual_match:
        sections['qualifications'] = qual_match.group(1).strip()

    return sections

# -----------------------------
# Main Entry Function
# -----------------------------

def post_job_from_image(image_data: bytes) -> Dict:
    load_skills_from_files()  # Ensure skills are loaded even in fallback path

    def run_ocr_pipeline(preprocess_func):
        processed_img = preprocess_func(image_data)
        text = extract_text_from_image(processed_img)
        return text

    try:
        raw_text = run_ocr_pipeline(preprocess_image)

        # Fallback if OCR fails
        if not raw_text.strip():
            print("OCR failed on enhanced pipeline, falling back to basic preprocessing...", file=sys.stderr)
            raw_text = run_ocr_pipeline(basic_preprocess_image)

        if not raw_text.strip():
            raise ValueError("OCR returned empty text")

        job_data = extract_job_sections(raw_text)

        skill_source = job_data['qualifications'] or job_data['description']
        job_data['skills'] = extract_skills(skill_source)

        return job_data

    except Exception as e:
        print(f'Error processing job image: {e}', file=sys.stderr)
        raise


# -----------------------------
# CLI Entry (for testing)
# -----------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python job_processor.py <image_path>")
        sys.exit(1)

    try:
        load_skills_from_files()

        with open(sys.argv[1], 'rb') as f:
            image_data = f.read()

        result = post_job_from_image(image_data)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
