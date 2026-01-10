from datetime import datetime
from typing import Optional
import uuid
import secrets
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship


class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(Boolean, default=True, nullable=False)
    is_admin = db.Column(Boolean, default=False, nullable=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    last_login = db.Column(DateTime)

    invite_code_id = db.Column(String(36), ForeignKey('invite_codes.id'), nullable=True)

    chats = relationship('Chat', backref='user', lazy='dynamic')

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def update_last_login(self) -> None:
        self.last_login = datetime.utcnow()
        db.session.commit()

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'email': self.email,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

    @staticmethod
    def create_admin(email: str, password: str) -> 'User':
        user = User(email=email, is_admin=True, is_active=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user


class InviteCode(db.Model):
    __tablename__ = 'invite_codes'

    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = db.Column(db.String(32), nullable=False, unique=True, index=True)
    created_by_id = db.Column(String(36), ForeignKey('users.id'), nullable=True)
    max_uses = db.Column(Integer, default=1, nullable=False)
    uses_count = db.Column(Integer, default=0, nullable=False)
    is_active = db.Column(Boolean, default=True, nullable=False)
    expires_at = db.Column(DateTime, nullable=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    created_by = relationship('User', foreign_keys=[created_by_id], backref='created_invite_codes')
    users = relationship('User', foreign_keys=[User.invite_code_id], backref='invite_code')

    @staticmethod
    def generate_code() -> str:
        return secrets.token_urlsafe(16)[:24].upper()

    def is_valid(self) -> bool:
        if not self.is_active:
            return False
        if self.uses_count >= self.max_uses:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True

    def use(self) -> bool:
        if not self.is_valid():
            return False
        self.uses_count += 1
        if self.uses_count >= self.max_uses:
            self.is_active = False
        db.session.commit()
        return True

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'code': self.code,
            'max_uses': self.max_uses,
            'uses_count': self.uses_count,
            'is_active': self.is_active,
            'is_valid': self.is_valid(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by_email': self.created_by.email if self.created_by else None
        }

    @staticmethod
    def create(created_by: Optional['User'] = None, max_uses: int = 1, expires_at: Optional[datetime] = None) -> 'InviteCode':
        code = InviteCode(
            code=InviteCode.generate_code(),
            created_by_id=created_by.id if created_by else None,
            max_uses=max_uses,
            expires_at=expires_at
        )
        db.session.add(code)
        db.session.commit()
        return code
