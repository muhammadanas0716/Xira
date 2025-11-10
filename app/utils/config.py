import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DOWNLOADS_DIR = os.path.abspath(os.path.join(BASE_DIR, os.getenv('DOWNLOADS_DIR', 'downloads')))
    SEC_API_KEY = os.getenv('SEC_API_KEY')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    @staticmethod
    def init_app(app):
        os.makedirs(Config.DOWNLOADS_DIR, exist_ok=True)

