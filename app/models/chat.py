import uuid
from datetime import datetime
from typing import Dict, List, Optional

class Chat:
    def __init__(self, ticker: str, stock_info: Dict, pdf_text: Optional[str] = None):
        self.id = str(uuid.uuid4())
        self.ticker = ticker
        self.created_at = datetime.now().isoformat()
        self.stock_info = stock_info
        self.pdf_text = pdf_text
        self.messages: List[Dict] = []
        self.conversation_messages: List[Dict] = []
        self.generated_report: Optional[str] = None
        self.report_generated_at: Optional[str] = None
        self._cached_pdf_message_initial: Optional[str] = None
        self._cached_pdf_message_continuation: Optional[str] = None
        self.assistant_id: Optional[str] = None
        self.thread_id: Optional[str] = None
        self.file_id: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'ticker': self.ticker,
            'created_at': self.created_at,
            'stock_info': self.stock_info,
            'pdf_text': self.pdf_text,
            'messages': self.messages,
            'has_report': self.generated_report is not None,
            'report_generated_at': self.report_generated_at,
            'assistant_id': self.assistant_id,
            'thread_id': self.thread_id,
            'file_id': self.file_id
        }
    
    def add_message(self, question: str, answer: str):
        message = {
            'question': question,
            'answer': answer,
            'timestamp': datetime.now().isoformat()
        }
        self.messages.append(message)
        return message
    
    def set_report(self, report: str):
        self.generated_report = report
        self.report_generated_at = datetime.now().isoformat()
    
    def get_pdf_message(self, is_continuation: bool = False) -> Optional[str]:
        if not self.pdf_text:
            return None
        
        if is_continuation:
            if self._cached_pdf_message_continuation is None:
                self._cached_pdf_message_continuation = f"""SEC filing document (same as previous conversation):

{self.pdf_text}"""
            return self._cached_pdf_message_continuation
        else:
            if self._cached_pdf_message_initial is None:
                self._cached_pdf_message_initial = f"""SEC filing document:

{self.pdf_text}"""
            return self._cached_pdf_message_initial

chats: Dict[str, Chat] = {}

