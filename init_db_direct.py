#!/usr/bin/env python3
"""
Directly initialize database schema (no HTTP server needed)
Usage: python init_db_direct.py
"""

import os
import sys

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.chat import Chat, Message, TickerPDF
from app.utils.config import Config

def init_database():
    print("Initializing database...")
    
    if not Config.DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not configured")
        print("Please set DATABASE_URL environment variable")
        sys.exit(1)
    
    app = create_app()
    
    with app.app_context():
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            needs_recreate = False
            if 'ticker_pdfs' in existing_tables:
                columns = [col['name'] for col in inspector.get_columns('ticker_pdfs')]
                print(f"Existing columns in ticker_pdfs: {columns}")
                if 'filing_date' not in columns:
                    needs_recreate = True
                    print("⚠️  Schema mismatch detected - will recreate tables")
            
            if needs_recreate:
                print("Dropping existing tables...")
                db.session.execute(text('DROP TABLE IF EXISTS ticker_pdfs CASCADE'))
                db.session.execute(text('DROP TABLE IF EXISTS messages CASCADE'))
                db.session.execute(text('DROP TABLE IF EXISTS chats CASCADE'))
                db.session.commit()
                print("✅ Dropped existing tables")
            
            print("Creating tables...")
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Verify tables were created
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"\nCreated tables: {tables}")
            
            if 'ticker_pdfs' in tables:
                columns = [col['name'] for col in inspector.get_columns('ticker_pdfs')]
                print(f"ticker_pdfs columns: {columns}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    init_database()

