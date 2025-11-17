import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DOWNLOADS_DIR = os.path.abspath(os.path.join(BASE_DIR, os.getenv('DOWNLOADS_DIR', 'downloads')))
    SEC_API_KEY = os.getenv('SEC_API_KEY')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    POLYGON_API_KEY = os.getenv('POLYGON_API_KEY')
    
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL if DATABASE_URL else 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    TESTING = os.getenv('TESTING', 'False').lower() == 'true'
    
    @staticmethod
    def init_app(app):
        try:
            os.makedirs(Config.DOWNLOADS_DIR, exist_ok=True)
        except (OSError, PermissionError):
            pass

