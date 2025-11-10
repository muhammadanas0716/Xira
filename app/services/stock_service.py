from typing import Optional, Dict
import yfinance as yf

class StockService:
    @staticmethod
    def get_stock_info(ticker: str) -> Optional[Dict]:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            hist = stock.history(period="1d")
            
            current_price = hist['Close'].iloc[-1] if not hist.empty else info.get('currentPrice', 'N/A')
            
            return {
                'ticker': ticker,
                'name': info.get('longName', ticker),
                'currentPrice': float(current_price) if isinstance(current_price, (int, float)) else current_price,
                'marketCap': info.get('marketCap'),
                'peRatio': info.get('trailingPE'),
                'dividendYield': info.get('dividendYield'),
                '52WeekHigh': info.get('fiftyTwoWeekHigh'),
                '52WeekLow': info.get('fiftyTwoWeekLow'),
                'volume': info.get('volume'),
                'sector': info.get('sector'),
                'industry': info.get('industry')
            }
        except Exception as e:
            print(f"Error fetching stock info: {e}")
            return None

stock_service = StockService()

