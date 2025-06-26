import sys
import os
import subprocess

def main():
    if len(sys.argv) != 3:
        print("Usage: python docx_to_pdf.py <input.docx> <output.pdf>")
        sys.exit(1)

    input_path = os.path.abspath(sys.argv[1])
    output_pdf_path = os.path.abspath(sys.argv[2])
    output_dir = os.path.dirname(output_pdf_path)

    try:
        # Ensure output directory exists
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Run LibreOffice to convert DOCX to PDF
        command = [
            'libreoffice',
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            input_path
        ]

        print(f"Running command: {' '.join(command)}")
        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"LibreOffice conversion failed:\n{result.stderr}")
            sys.exit(1)

        # Verify output file was created
        expected_pdf_path = os.path.join(output_dir, os.path.splitext(os.path.basename(input_path))[0] + '.pdf')

        if not os.path.exists(expected_pdf_path):
            print("Error: Expected output PDF not found.")
            sys.exit(1)

        # Rename/move to desired output path if needed
        if expected_pdf_path != output_pdf_path:
            os.rename(expected_pdf_path, output_pdf_path)

        print("Conversion successful.")

    except Exception as e:
        print(f"Conversion failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
