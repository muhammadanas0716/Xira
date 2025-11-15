from datetime import datetime
from typing import Dict, List, Optional
from app import db
from sqlalchemy import JSON, Text, ForeignKey, Date, String
from sqlalchemy.orm import relationship
import uuid

class TickerPDF(db.Model):
    __tablename__ = 'ticker_pdfs'
    
    ticker = db.Column(db.String(10), primary_key=True)
    filing_date = db.Column(Date, primary_key=True)
    pdf_text = db.Column(Text, nullable=False)
    pdf_filename = db.Column(db.String(255))
    filed_at = db.Column(db.DateTime)
    period_end_date = db.Column(Date)
    accession_number = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class Chat(db.Model):
    __tablename__ = 'chats'
    
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticker = db.Column(db.String(10), nullable=False, index=True)
    filing_date = db.Column(Date, nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    stock_info = db.Column(JSON, nullable=False)
    generated_report = db.Column(Text)
    report_generated_at = db.Column(db.DateTime)
    
    messages = db.relationship('Message', backref='chat', lazy=True, cascade='all, delete-orphan', order_by='Message.created_at')
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'ticker': self.ticker,
            'filing_date': self.filing_date.isoformat() if self.filing_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'stock_info': self.stock_info,
            'pdf_text': self.pdf_text,
            'messages': [msg.to_dict() for msg in self.messages],
            'has_report': self.generated_report is not None,
            'report_generated_at': self.report_generated_at.isoformat() if self.report_generated_at else None
        }
    
    @property
    def ticker_pdf(self):
        if not self.ticker or not self.filing_date:
            return None
        return TickerPDF.query.filter_by(ticker=self.ticker, filing_date=self.filing_date).first()
    
    @property
    def pdf_text(self) -> Optional[str]:
        ticker_pdf = self.ticker_pdf
        return ticker_pdf.pdf_text if ticker_pdf else None
    
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
        pdf_text = self.pdf_text
        if not pdf_text:
            return None
        
        if is_continuation:
            return f"""SEC filing document (same as previous conversation):

{pdf_text}"""
        else:
            return f"""SEC filing document:

{pdf_text}"""


class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = db.Column(String(36), db.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False, index=True)
    question = db.Column(Text, nullable=False)
    answer = db.Column(Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def to_dict(self) -> Dict:
        return {
            'question': self.question,
            'answer': self.answer,
            'timestamp': self.created_at.isoformat() if self.created_at else None
        }
