import os
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
            print("PDF Generator API not available")
            return None
        
        if not filing_url:
            print("No filing URL provided")
            return None
        
        try:
            print(f"Downloading PDF for {ticker} from {filing_url}")
            pdf_content = self.pdf_generator_api.get_pdf(filing_url)
            
            if not pdf_content:
                print(f"No PDF content received for {ticker}")
                return None
            
            os.makedirs(Config.DOWNLOADS_DIR, exist_ok=True)
            filename = f"{ticker}_latest_10Q.pdf"
            filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
            
            with open(filepath, 'wb') as f:
                f.write(pdf_content)
            
            print(f"PDF downloaded successfully: {filepath}")
            return filename
        except Exception as e:
            print(f"Error downloading PDF: {e}")
            import traceback
            traceback.print_exc()
            return None

sec_service = SECService()

