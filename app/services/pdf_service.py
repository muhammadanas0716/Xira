import os
import PyPDF2
import pdfplumber
from typing import Optional
from app.utils.config import Config

class PDFService:
    @staticmethod
    def extract_text(filename: str) -> Optional[str]:
        filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"PDF file not found: {filepath}")
            return None
        
        text = ""
        try:
            with pdfplumber.open(filepath) as pdf:
                print(f"Extracting text from PDF: {filename}, Pages: {len(pdf.pages)}")
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
                    if i % 10 == 0:
                        print(f"Extracted {i+1} pages, text length: {len(text)}")
            
            if not text or len(text.strip()) < 100:
                print("PDF extraction returned little/no text, trying PyPDF2 fallback...")
                with open(filepath, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
            
            text = text.strip()
            print(f"Final extracted text length: {len(text)} characters")
            
            if len(text) < 100:
                print("WARNING: Very little text extracted from PDF!")
                return None
            
            return text
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            import traceback
            traceback.print_exc()
            return None

pdf_service = PDFService()

