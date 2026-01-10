import os
import re
from typing import Optional, List, Dict
from datetime import datetime
from sec_api import QueryApi, PdfGeneratorApi
from app.utils.config import Config


class SECService:
    def __init__(self):
        self.query_api = QueryApi(api_key=Config.SEC_API_KEY) if Config.SEC_API_KEY else None
        self.pdf_generator_api = PdfGeneratorApi(api_key=Config.SEC_API_KEY) if Config.SEC_API_KEY else None

    def is_available(self) -> bool:
        return self.query_api is not None

    def get_all_10q_filings(self, ticker: str, limit: int = 20) -> List[Dict]:
        """Fetch all available 10-Q filings for a ticker"""
        if not self.query_api:
            return []

        query = {
            "query": {
                "query_string": {
                    "query": f"ticker:{ticker} AND formType:10-Q"
                }
            },
            "from": "0",
            "size": str(limit),
            "sort": [{"filedAt": {"order": "desc"}}]
        }

        try:
            response = self.query_api.get_filings(query)
            filings = response.get('filings', [])

            result = []
            for filing in filings:
                filing_info = self._parse_filing(filing)
                if filing_info:
                    result.append(filing_info)

            return result

        except Exception as e:
            print(f"Error fetching 10-Q filings: {e}")
            return []

    def get_all_10k_filings(self, ticker: str, limit: int = 10) -> List[Dict]:
        """Fetch all available 10-K filings for a ticker"""
        if not self.query_api:
            return []

        query = {
            "query": {
                "query_string": {
                    "query": f"ticker:{ticker} AND formType:10-K"
                }
            },
            "from": "0",
            "size": str(limit),
            "sort": [{"filedAt": {"order": "desc"}}]
        }

        try:
            response = self.query_api.get_filings(query)
            filings = response.get('filings', [])

            result = []
            for filing in filings:
                filing_info = self._parse_filing(filing, form_type='10-K')
                if filing_info:
                    result.append(filing_info)

            return result

        except Exception as e:
            print(f"Error fetching 10-K filings: {e}")
            return []

    def _parse_filing(self, filing: Dict, form_type: str = '10-Q') -> Optional[Dict]:
        """Parse a filing response into a standardized format"""
        try:
            filed_at = filing.get('filedAt')
            period_end = filing.get('periodOfReport')
            accession_number = filing.get('accessionNo')

            if not accession_number:
                return None

            filing_date = self._parse_date(filed_at)
            period_end_date = self._parse_date(period_end)

            fiscal_info = self._get_fiscal_period_info(period_end_date, form_type)

            return {
                'url': filing.get('linkToFilingDetails'),
                'filed_at': filed_at,
                'filing_date': filing_date.isoformat() if filing_date else None,
                'period_end_date': period_end_date.isoformat() if period_end_date else None,
                'accession_number': accession_number,
                'form_type': form_type,
                'fiscal_year': fiscal_info['fiscal_year'],
                'fiscal_quarter': fiscal_info['fiscal_quarter'],
                'company_name': filing.get('companyName', ''),
                'ticker': filing.get('ticker', '')
            }

        except Exception as e:
            print(f"Error parsing filing: {e}")
            return None

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse various date formats"""
        if not date_str:
            return None

        try:
            if 'T' in date_str:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                return datetime.strptime(date_str, '%Y-%m-%d')
        except Exception:
            return None

    def _get_fiscal_period_info(self, period_end_date: Optional[datetime], form_type: str) -> Dict:
        """
        Determine fiscal year and quarter from period end date.
        This provides a basic mapping - companies with non-standard fiscal years
        will show their actual period end date for clarity.
        """
        if not period_end_date:
            return {'fiscal_year': 0, 'fiscal_quarter': None}

        year = period_end_date.year
        month = period_end_date.month

        if form_type == '10-K':
            return {'fiscal_year': year, 'fiscal_quarter': None}

        if month in [1, 2, 3]:
            quarter = 1
        elif month in [4, 5, 6]:
            quarter = 2
        elif month in [7, 8, 9]:
            quarter = 3
        else:
            quarter = 4

        return {'fiscal_year': year, 'fiscal_quarter': quarter}

    def get_latest_10q_url(self, ticker: str) -> Optional[Dict]:
        """Get the latest 10-Q filing URL (backward compatible)"""
        filings = self.get_all_10q_filings(ticker, limit=1)
        return filings[0] if filings else None

    def get_filing_by_accession(self, accession_number: str) -> Optional[Dict]:
        """Get a specific filing by accession number"""
        if not self.query_api:
            return None

        query = {
            "query": {
                "query_string": {
                    "query": f"accessionNo:\"{accession_number}\""
                }
            },
            "from": "0",
            "size": "1"
        }

        try:
            response = self.query_api.get_filings(query)
            filings = response.get('filings', [])

            if filings:
                return self._parse_filing(filings[0])
            return None

        except Exception as e:
            print(f"Error fetching filing by accession: {e}")
            return None

    def download_pdf(self, filing_url: str, ticker: str, filename: Optional[str] = None) -> Optional[str]:
        """Download PDF for a filing"""
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

            pdf_content = self.pdf_generator_api.get_pdf(filing_url)

            if not pdf_content:
                print(f"No PDF content received for {ticker}")
                return None

            if not isinstance(pdf_content, bytes):
                if isinstance(pdf_content, str):
                    pdf_content = pdf_content.encode('utf-8')
                else:
                    pdf_content = bytes(pdf_content)

            os.makedirs(Config.DOWNLOADS_DIR, exist_ok=True)

            if not filename:
                filename = f"{ticker}_10Q.pdf"

            filepath = os.path.join(Config.DOWNLOADS_DIR, filename)

            with open(filepath, 'wb') as f:
                f.write(pdf_content)

            file_size = os.path.getsize(filepath)
            print(f"PDF downloaded: {filepath} ({file_size} bytes)")

            if file_size == 0:
                os.remove(filepath)
                return None

            return filename

        except Exception as e:
            print(f"Error downloading PDF: {e}")
            import traceback
            traceback.print_exc()
            return None


sec_service = SECService()
