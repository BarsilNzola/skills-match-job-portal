from pdf2docx import Converter
import sys

input_pdf = sys.argv[1]
output_docx = sys.argv[2]

try:
    cv = Converter(input_pdf)
    cv.convert(output_docx, start=0, end=None)
    cv.close()
    print("Conversion successful")
except Exception as e:
    print(f"Conversion failed: {str(e)}")
    sys.exit(1)