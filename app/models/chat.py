from datetime import datetime
from typing import Dict, List, Optional
from app import db
from sqlalchemy import JSON, Text, ForeignKey, Date, String, Boolean, Integer
from sqlalchemy.orm import relationship
import uuid


class SECFiling(db.Model):
    __tablename__ = 'sec_filings'

    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticker = db.Column(db.String(10), nullable=False, index=True)
    form_type = db.Column(db.String(10), nullable=False, default='10-Q')
    fiscal_year = db.Column(Integer, nullable=False)
    fiscal_quarter = db.Column(Integer, nullable=True)
    filing_date = db.Column(Date, nullable=False, index=True)
    period_end_date = db.Column(Date, nullable=True)
    accession_number = db.Column(db.String(50), unique=True, nullable=False)
    filing_url = db.Column(db.String(500), nullable=True)
    pdf_filename = db.Column(db.String(255), nullable=True)

    total_chunks = db.Column(Integer, default=0)
    pinecone_namespace = db.Column(db.String(100), nullable=True)
    is_embedded = db.Column(Boolean, default=False, nullable=False)
    embedded_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    chats = relationship('Chat', backref='filing', lazy='dynamic')

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'ticker': self.ticker,
            'form_type': self.form_type,
            'fiscal_year': self.fiscal_year,
            'fiscal_quarter': self.fiscal_quarter,
            'fiscal_period': f"FY{self.fiscal_year} Q{self.fiscal_quarter}" if self.fiscal_quarter else f"FY{self.fiscal_year}",
            'filing_date': self.filing_date.isoformat() if self.filing_date else None,
            'period_end_date': self.period_end_date.isoformat() if self.period_end_date else None,
            'accession_number': self.accession_number,
            'is_embedded': self.is_embedded,
            'total_chunks': self.total_chunks,
            'embedded_at': self.embedded_at.isoformat() if self.embedded_at else None
        }

    def get_namespace(self) -> str:
        if self.pinecone_namespace:
            return self.pinecone_namespace
        clean_accession = self.accession_number.replace('-', '')
        self.pinecone_namespace = f"{self.ticker}_{clean_accession}"
        return self.pinecone_namespace


class Chat(db.Model):
    __tablename__ = 'chats'

    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    filing_id = db.Column(String(36), db.ForeignKey('sec_filings.id'), nullable=False, index=True)
    ticker = db.Column(db.String(10), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    stock_info = db.Column(JSON, nullable=True)
    generated_report = db.Column(Text, nullable=True)
    report_generated_at = db.Column(db.DateTime, nullable=True)

    messages = relationship('Message', backref='chat', lazy=True, cascade='all, delete-orphan', order_by='Message.created_at')

    def to_dict(self) -> Dict:
        filing = self.filing
        return {
            'id': self.id,
            'ticker': self.ticker,
            'filing': filing.to_dict() if filing else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'stock_info': self.stock_info,
            'messages': [msg.to_dict() for msg in self.messages],
            'has_report': self.generated_report is not None,
            'report_generated_at': self.report_generated_at.isoformat() if self.report_generated_at else None
        }

    def add_message(self, question: str, answer: str) -> 'Message':
        message = Message(
            chat_id=self.id,
            question=question,
            answer=answer
        )
        db.session.add(message)
        db.session.commit()
        return message

    def set_report(self, report: str) -> None:
        self.generated_report = report
        self.report_generated_at = datetime.utcnow()
        db.session.commit()

    def get_conversation_history(self, limit: int = 10) -> List[Dict]:
        recent_messages = self.messages[-limit:] if len(self.messages) > limit else self.messages
        return [{'question': msg.question, 'answer': msg.answer} for msg in recent_messages]


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = db.Column(String(36), db.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False, index=True)
    question = db.Column(Text, nullable=False)
    answer = db.Column(Text, nullable=False)
    retrieved_chunks = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'question': self.question,
            'answer': self.answer,
            'timestamp': self.created_at.isoformat() if self.created_at else None
        }
