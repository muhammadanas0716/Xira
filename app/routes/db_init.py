from flask import Blueprint, jsonify, current_app
from app import db
from app.models.chat import Chat, Message, TickerPDF
from app.utils.config import Config

db_init_bp = Blueprint('db_init', __name__)

@db_init_bp.route('/api/db/init', methods=['POST'])
def init_database():
    if not Config.DATABASE_URL:
        return jsonify({'error': 'DATABASE_URL not configured'}), 400
    
    try:
        with current_app.app_context():
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            needs_recreate = False
            if 'ticker_pdfs' in existing_tables:
                columns = [col['name'] for col in inspector.get_columns('ticker_pdfs')]
                if 'filing_date' not in columns:
                    needs_recreate = True
            
            if needs_recreate:
                db.session.execute(text('DROP TABLE IF EXISTS ticker_pdfs CASCADE'))
                db.session.execute(text('DROP TABLE IF EXISTS messages CASCADE'))
                db.session.execute(text('DROP TABLE IF EXISTS chats CASCADE'))
                db.session.commit()
                print("Dropped existing tables with incorrect schema")
            
            db.create_all()
            return jsonify({
                'success': True,
                'message': 'Database tables created successfully'
            })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'Failed to initialize database'
        }), 500

