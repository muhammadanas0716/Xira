from flask import Flask, render_template, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from app.utils.config import Config

db = SQLAlchemy()

def create_app():
    template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates'))
    static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'static'))
    
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    app.config.from_object(Config)
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400
    
    db.init_app(app)
    
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5000,http://localhost:5001').split(',')
    CORS(app, origins=allowed_origins if allowed_origins else ['*'], supports_credentials=True)
    
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        if request.is_secure or os.getenv('FLASK_ENV') == 'production':
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.openai.com; frame-src 'none'; object-src 'none';"
        return response
    
    from app.routes.main import main_bp
    from app.routes.api import api_bp
    from app.routes.db_init import db_init_bp
    from app.routes.admin import admin_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(db_init_bp)
    app.register_blueprint(admin_bp)
    
    from app.models.chat import Chat, Message, TickerPDF
    from app.models.waitlist import WaitlistEmail
    
    @app.before_request
    def ensure_database_initialized():
        if not hasattr(app, '_db_initialized'):
            try:
                if app.config.get('SQLALCHEMY_DATABASE_URI') and app.config.get('SQLALCHEMY_DATABASE_URI') != 'sqlite:///:memory:':
                    with app.app_context():
                        try:
                            from sqlalchemy import inspect
                            inspector = inspect(db.engine)
                            existing_tables = inspector.get_table_names()
                            
                            if 'ticker_pdfs' in existing_tables:
                                columns = [col['name'] for col in inspector.get_columns('ticker_pdfs')]
                                if 'filing_date' not in columns:
                                    print("Warning: ticker_pdfs table exists but missing filing_date column. You may need to recreate the table.")
                            
                            db.create_all()
                            app._db_initialized = True
                            print("Database tables initialized successfully")
                        except Exception as db_error:
                            error_msg = str(db_error)
                            if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower() or 'relation' in error_msg.lower():
                                app._db_initialized = True
                                print("Database tables already exist")
                            else:
                                print(f"Error: Database initialization failed: {db_error}")
                                import traceback
                                traceback.print_exc()
                                app._db_initialized = False
                else:
                    app._db_initialized = True
            except Exception as e:
                print(f"Error: Database initialization check failed: {e}")
                import traceback
                traceback.print_exc()
                app._db_initialized = False
    
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return render_template('500.html'), 500
    
    return app

