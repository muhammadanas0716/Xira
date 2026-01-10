import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DOWNLOADS_DIR = os.path.abspath(os.path.join(BASE_DIR, os.getenv('DOWNLOADS_DIR', 'downloads')))

    # API Keys
    SEC_API_KEY = os.getenv('SEC_API_KEY')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    POLYGON_API_KEY = os.getenv('POLYGON_API_KEY')
    VOYAGE_API_KEY = os.getenv('VOYAGE_API_KEY')
    PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')

    # Pinecone Config
    PINECONE_INDEX_NAME = os.getenv('PINECONE_INDEX_NAME', 'sec-filings')
    PINECONE_ENVIRONMENT = os.getenv('PINECONE_ENVIRONMENT', 'us-east-1')

    # RAG Config
    CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', '1000'))
    CHUNK_OVERLAP = int(os.getenv('CHUNK_OVERLAP', '200'))
    RETRIEVAL_TOP_K = int(os.getenv('RETRIEVAL_TOP_K', '5'))

    # Auth Config
    PASSWORD_MIN_LENGTH = 8
    SESSION_LIFETIME_HOURS = 24

    # Database
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
