from datetime import datetime
from typing import Dict, List, Optional
from app import db
from sqlalchemy import JSON, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Chat(db.Model):
    __tablename__ = 'chats'
    
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticker = db.Column(db.String(10), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    stock_info = db.Column(JSON, nullable=False)
    pdf_text = db.Column(Text)
    generated_report = db.Column(Text)
    report_generated_at = db.Column(db.DateTime)
    assistant_id = db.Column(db.String(255))
    thread_id = db.Column(db.String(255))
    file_id = db.Column(db.String(255))
    
    messages = db.relationship('Message', backref='chat', lazy=True, cascade='all, delete-orphan', order_by='Message.created_at')
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'ticker': self.ticker,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'stock_info': self.stock_info,
            'pdf_text': self.pdf_text,
            'messages': [msg.to_dict() for msg in self.messages],
            'has_report': self.generated_report is not None,
            'report_generated_at': self.report_generated_at.isoformat() if self.report_generated_at else None,
            'assistant_id': self.assistant_id,
            'thread_id': self.thread_id,
            'file_id': self.file_id
        }
    
    def add_message(self, question: str, answer: str):
        message = Message(
            chat_id=self.id,
            question=question,
            answer=answer
        )
        db.session.add(message)
        db.session.commit()
        return message
    
    def set_report(self, report: str):
        self.generated_report = report
        self.report_generated_at = datetime.utcnow()
        db.session.commit()
    
    def get_pdf_message(self, is_continuation: bool = False) -> Optional[str]:
        if not self.pdf_text:
            return None
        
        if is_continuation:
            return f"""SEC filing document (same as previous conversation):

{self.pdf_text}"""
        else:
            return f"""SEC filing document:

{self.pdf_text}"""


class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = db.Column(UUID(as_uuid=False), db.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False, index=True)
    question = db.Column(Text, nullable=False)
    answer = db.Column(Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def to_dict(self) -> Dict:
        return {
            'question': self.question,
            'answer': self.answer,
            'timestamp': self.created_at.isoformat() if self.created_at else None
        }
