import sys
from docx2pdf import convert
import os

def main():
    if len(sys.argv) != 3:
        print("Usage: python docx_to_pdf.py <input.docx> <output.pdf>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        # Convert docx to pdf
        convert(input_path, output_path)
        
        # Verify the output file was created
        if not os.path.exists(output_path):
            print(f"Error: Output file {output_path} was not created")
            sys.exit(1)
            
        print("Conversion successful")
    except Exception as e:
        print(f"Conversion failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()