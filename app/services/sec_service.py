import os
import re
from typing import Optional
from sec_api import QueryApi, PdfGeneratorApi
from app.utils.config import Config

class SECService:
    def __init__(self):
        self.query_api = QueryApi(api_key=Config.SEC_API_KEY) if Config.SEC_API_KEY else None
        self.pdf_generator_api = PdfGeneratorApi(api_key=Config.SEC_API_KEY) if Config.SEC_API_KEY else None
    
    def get_latest_10q_url(self, ticker: str) -> Optional[str]:
        if not self.query_api:
            return None
        query = {
            "query": {
                "query_string": {
                    "query": f"ticker:{ticker} AND formType:10-Q"
                }
            },
            "from": "0",
            "size": "1",
            "sort": [{"filedAt": {"order": "desc"}}]
        }
        try:
            response = self.query_api.get_filings(query)
            filings = response.get('filings', [])
            if not filings:
                return None
            return filings[0].get('linkToFilingDetails')
        except Exception as e:
            print(f"Error fetching 10-Q URL: {e}")
            return None
    
    def download_pdf(self, filing_url: str, ticker: str) -> Optional[str]:
        if not self.pdf_generator_api:
            print("PDF Generator API not available - SEC_API_KEY not configured")
            return None
        
        if not filing_url or not isinstance(filing_url, str):
            print("No filing URL provided")
            return None
        
        if not ticker or not re.match(r'^[A-Z0-9]{1,10}$', ticker):
            print("Invalid ticker symbol")
            return None
        
        try:
            print(f"Downloading PDF for {ticker} from {filing_url}")
            print(f"Downloads directory: {Config.DOWNLOADS_DIR}")
            
            pdf_content = self.pdf_generator_api.get_pdf(filing_url)
            
            if not pdf_content:
                print(f"No PDF content received for {ticker}")
                return None
            
            if not isinstance(pdf_content, bytes):
                print(f"PDF content is not bytes, converting... Type: {type(pdf_content)}")
                if isinstance(pdf_content, str):
                    pdf_content = pdf_content.encode('utf-8')
                else:
                    pdf_content = bytes(pdf_content)
            
            os.makedirs(Config.DOWNLOADS_DIR, exist_ok=True)
            filename = f"{ticker}_latest_10Q.pdf"
            filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
            
            print(f"Writing PDF to: {filepath}")
            with open(filepath, 'wb') as f:
                f.write(pdf_content)
            
            if not os.path.exists(filepath):
                print(f"ERROR: File was not created at {filepath}")
                return None
            
            file_size = os.path.getsize(filepath)
            print(f"PDF downloaded successfully: {filepath} ({file_size} bytes)")
            
            if file_size == 0:
                print(f"WARNING: Downloaded file is empty!")
                os.remove(filepath)
                return None
            
            return filename
        except Exception as e:
            print(f"Error downloading PDF: {e}")
            import traceback
            traceback.print_exc()
            return None

sec_service = SECService()

