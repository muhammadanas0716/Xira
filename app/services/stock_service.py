from typing import Optional, Dict
import yfinance as yf
from app.utils.config import Config

try:
    from polygon import RESTClient
    POLYGON_AVAILABLE = True
except ImportError:
    POLYGON_AVAILABLE = False

class StockService:
    def __init__(self):
        self.polygon_client = None
        if POLYGON_AVAILABLE and Config.POLYGON_API_KEY:
            try:
                self.polygon_client = RESTClient(Config.POLYGON_API_KEY)
            except Exception as e:
                print(f"Failed to initialize Polygon client: {e}")
    
    def _get_polygon_data(self, ticker: str) -> Optional[Dict]:
        if not self.polygon_client:
            return None
        
        try:
            data = {}
            
            try:
                ticker_details = self.polygon_client.get_ticker_details(ticker)
                if ticker_details and hasattr(ticker_details, 'results'):
                    results = ticker_details.results
                    data['name'] = getattr(results, 'name', None)
                    data['marketCap'] = getattr(results, 'market_cap', None)
                    data['sector'] = getattr(results, 'sic_description', None)
                    data['industry'] = getattr(results, 'description', None)
                    data['website'] = getattr(results, 'homepage_url', None)
                    data['employees'] = getattr(results, 'total_employees', None)
                    data['sharesOutstanding'] = getattr(results, 'share_class_shares_outstanding', None)
            except Exception as e:
                print(f"Error fetching Polygon ticker details: {e}")
            
            try:
                prev_close = self.polygon_client.get_previous_close_aggregate(ticker)
                if prev_close and hasattr(prev_close, 'results') and prev_close.results:
                    result = prev_close.results[0]
                    data['currentPrice'] = getattr(result, 'c', None)
                    data['open'] = getattr(result, 'o', None)
                    data['high'] = getattr(result, 'h', None)
                    data['low'] = getattr(result, 'l', None)
                    data['volume'] = getattr(result, 'v', None)
                    data['prevClose'] = getattr(result, 'c', None)
            except Exception as e:
                print(f"Error fetching Polygon previous close: {e}")
            
            return data if data else None
        except Exception as e:
            print(f"Error fetching Polygon data: {e}")
            return None
    
    def _get_yfinance_data(self, ticker: str) -> Optional[Dict]:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            hist = stock.history(period="1d")
            
            current_price = hist['Close'].iloc[-1] if not hist.empty else info.get('currentPrice')
            
            return {
                'ticker': ticker,
                'name': info.get('longName') or info.get('shortName') or ticker,
                'currentPrice': float(current_price) if isinstance(current_price, (int, float)) else None,
                'marketCap': info.get('marketCap'),
                'peRatio': info.get('trailingPE') or info.get('forwardPE'),
                'dividendYield': info.get('dividendYield'),
                '52WeekHigh': info.get('fiftyTwoWeekHigh'),
                '52WeekLow': info.get('fiftyTwoWeekLow'),
                'volume': info.get('volume') or info.get('averageVolume'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'open': info.get('open'),
                'high': info.get('dayHigh'),
                'low': info.get('dayLow'),
                'prevClose': info.get('previousClose'),
                'beta': info.get('beta'),
                'eps': info.get('trailingEps') or info.get('forwardEps'),
                'revenue': info.get('totalRevenue'),
                'profitMargin': info.get('profitMargins'),
                'roe': info.get('returnOnEquity'),
                'roa': info.get('returnOnAssets'),
                'debtToEquity': info.get('debtToEquity'),
                'currentRatio': info.get('currentRatio'),
                'quickRatio': info.get('quickRatio'),
                'priceToBook': info.get('priceToBook'),
                'priceToSales': info.get('priceToSalesTrailing12Months'),
                'enterpriseValue': info.get('enterpriseValue'),
                'evToRevenue': info.get('enterpriseToRevenue'),
                'evToEbitda': info.get('enterpriseToEbitda'),
                'sharesOutstanding': info.get('sharesOutstanding'),
                'floatShares': info.get('floatShares'),
                'employees': info.get('fullTimeEmployees')
            }
        except Exception as e:
            print(f"Error fetching yfinance data: {e}")
            return None
    
    def get_stock_info(self, ticker: str) -> Optional[Dict]:
        polygon_data = self._get_polygon_data(ticker)
        yfinance_data = self._get_yfinance_data(ticker)
        
        if not yfinance_data:
            return None
        
        result = yfinance_data.copy()
        
        if polygon_data:
            for key, value in polygon_data.items():
                if value is not None:
                    result[key] = value
        
        if result.get('marketCap') and result.get('sharesOutstanding'):
            calculated_price = result['marketCap'] / result['sharesOutstanding']
            if not result.get('currentPrice'):
                result['currentPrice'] = calculated_price
        
        return result

stock_service = StockService()

