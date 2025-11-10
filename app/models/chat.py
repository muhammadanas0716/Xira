from datetime import datetime
from typing import Dict, List, Optional

class Chat:
    def __init__(self, ticker: str, stock_info: Dict, pdf_text: Optional[str] = None):
        self.id = f"{ticker}_{datetime.now().timestamp()}"
        self.ticker = ticker
        self.created_at = datetime.now().isoformat()
        self.stock_info = stock_info
        self.pdf_text = pdf_text
        self.messages: List[Dict] = []
        self.conversation_messages: List[Dict] = []
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'ticker': self.ticker,
            'created_at': self.created_at,
            'stock_info': self.stock_info,
            'pdf_text': self.pdf_text,
            'messages': self.messages
        }
    
    def add_message(self, question: str, answer: str):
        message = {
            'question': question,
            'answer': answer,
            'timestamp': datetime.now().isoformat()
        }
        self.messages.append(message)
        return message

chats: Dict[str, Chat] = {}

