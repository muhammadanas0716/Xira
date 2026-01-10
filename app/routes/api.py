import re
import uuid
import threading
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from app import db
from app.models.chat import Chat, Message, SECFiling
from app.models.waitlist import WaitlistEmail
from app.services.stock_service import stock_service
from app.services.sec_service import sec_service
from app.services.pdf_service import pdf_service
from app.services.llm_service import llm_service
from app.services.vector_service import vector_service
from app.services.chunking_service import chunking_service
from app.utils.config import Config

api_bp = Blueprint('api', __name__)


def validate_ticker(ticker):
    if not ticker or len(ticker) > 10:
        return False
    return bool(re.match(r'^[A-Z0-9]{1,10}$', ticker))


def sanitize_string(value, max_length=10000):
    if not isinstance(value, str):
        return None
    if len(value) > max_length:
        return None
    return value.strip()


def parse_date(date_str):
    if not date_str:
        return None
    try:
        if isinstance(date_str, str):
            return datetime.strptime(date_str[:10], '%Y-%m-%d').date()
        return None
    except Exception:
        return None


# Filing endpoints

@api_bp.route('/filings/<ticker>', methods=['GET'])
@login_required
def get_available_filings(ticker):
    """Get all available SEC filings for a ticker"""
    ticker = ticker.strip().upper()

    if not validate_ticker(ticker):
        return jsonify({'error': 'Invalid ticker symbol'}), 400

    filings = sec_service.get_all_10q_filings(ticker, limit=20)

    if not filings:
        return jsonify({'error': 'No filings found for this ticker'}), 404

    result = []
    for filing in filings:
        existing = SECFiling.query.filter_by(accession_number=filing['accession_number']).first()

        result.append({
            'accession_number': filing['accession_number'],
            'form_type': filing['form_type'],
            'fiscal_year': filing['fiscal_year'],
            'fiscal_quarter': filing['fiscal_quarter'],
            'fiscal_period': f"FY{filing['fiscal_year']} Q{filing['fiscal_quarter']}" if filing['fiscal_quarter'] else f"FY{filing['fiscal_year']}",
            'filing_date': filing['filing_date'],
            'period_end_date': filing['period_end_date'],
            'is_embedded': existing.is_embedded if existing else False,
            'id': existing.id if existing else None
        })

    return jsonify({
        'ticker': ticker,
        'filings': result
    })


@api_bp.route('/filings/<filing_id>/embed', methods=['POST'])
@login_required
def embed_filing(filing_id):
    """Start embedding process for a filing"""
    filing = SECFiling.query.get(filing_id)

    if not filing:
        return jsonify({'error': 'Filing not found'}), 404

    if filing.is_embedded:
        return jsonify({
            'success': True,
            'message': 'Filing already embedded',
            'filing': filing.to_dict()
        })

    thread = threading.Thread(
        target=embed_filing_background,
        args=(filing_id, current_app._get_current_object())
    )
    thread.daemon = True
    thread.start()

    return jsonify({
        'success': True,
        'message': 'Embedding process started',
        'filing_id': filing_id
    })


def embed_filing_background(filing_id, app):
    """Background task to embed a filing"""
    try:
        with app.app_context():
            filing = SECFiling.query.get(filing_id)
            if not filing:
                print(f"Filing {filing_id} not found")
                return

            if not filing.pdf_filename:
                print(f"Downloading PDF for {filing.ticker}...")
                filename = f"{filing.ticker}_{filing.accession_number.replace('-', '')}_10Q.pdf"
                result = sec_service.download_pdf(filing.filing_url, filing.ticker, filename)

                if not result:
                    print(f"Failed to download PDF for {filing.ticker}")
                    return

                filing.pdf_filename = result
                db.session.commit()

            import os
            filepath = os.path.join(Config.DOWNLOADS_DIR, filing.pdf_filename)
            pdf_text = pdf_service.extract_text(filepath)

            if not pdf_text:
                print(f"Failed to extract text from PDF for {filing.ticker}")
                return

            print(f"Extracted {len(pdf_text)} characters from PDF")

            filing_metadata = {
                'ticker': filing.ticker,
                'form_type': filing.form_type,
                'fiscal_year': filing.fiscal_year,
                'fiscal_quarter': filing.fiscal_quarter,
                'filing_date': filing.filing_date.isoformat() if filing.filing_date else '',
                'accession_number': filing.accession_number
            }

            chunks = chunking_service.chunk_document(pdf_text, filing_metadata)

            if not chunks:
                print(f"Failed to chunk document for {filing.ticker}")
                return

            namespace = filing.get_namespace()
            success = vector_service.upsert_chunks(chunks, namespace)

            if success:
                filing.is_embedded = True
                filing.embedded_at = datetime.utcnow()
                filing.total_chunks = len(chunks)
                filing.pinecone_namespace = namespace
                db.session.commit()
                print(f"Successfully embedded filing {filing.ticker} with {len(chunks)} chunks")
            else:
                print(f"Failed to upsert chunks for {filing.ticker}")

    except Exception as e:
        print(f"Error in background embedding: {e}")
        import traceback
        traceback.print_exc()


@api_bp.route('/filings/<filing_id>/status', methods=['GET'])
@login_required
def get_filing_status(filing_id):
    """Get embedding status for a filing"""
    filing = SECFiling.query.get(filing_id)

    if not filing:
        return jsonify({'error': 'Filing not found'}), 404

    return jsonify(filing.to_dict())


# Chat endpoints

@api_bp.route('/create-chat', methods=['POST'])
@login_required
def create_chat():
    """Create a new chat for a specific filing"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400

    ticker = data.get('ticker', '').strip().upper()
    accession_number = data.get('accession_number', '').strip()

    if not validate_ticker(ticker):
        return jsonify({'error': 'Invalid ticker symbol'}), 400

    if not accession_number:
        return jsonify({'error': 'Filing accession number is required'}), 400

    filing = SECFiling.query.filter_by(accession_number=accession_number).first()

    if not filing:
        filing_info = sec_service.get_filing_by_accession(accession_number)

        if not filing_info:
            return jsonify({'error': 'Filing not found'}), 404

        filing = SECFiling(
            ticker=ticker,
            form_type=filing_info.get('form_type', '10-Q'),
            fiscal_year=filing_info.get('fiscal_year', 0),
            fiscal_quarter=filing_info.get('fiscal_quarter'),
            filing_date=parse_date(filing_info.get('filing_date')),
            period_end_date=parse_date(filing_info.get('period_end_date')),
            accession_number=accession_number,
            filing_url=filing_info.get('url')
        )
        db.session.add(filing)
        db.session.commit()

    stock_info = stock_service.get_stock_info(ticker)

    chat = Chat(
        user_id=current_user.id,
        filing_id=filing.id,
        ticker=ticker,
        stock_info=stock_info
    )
    db.session.add(chat)
    db.session.commit()

    if not filing.is_embedded:
        thread = threading.Thread(
            target=embed_filing_background,
            args=(filing.id, current_app._get_current_object())
        )
        thread.daemon = True
        thread.start()

    return jsonify({
        'chat_id': chat.id,
        'ticker': ticker,
        'filing': filing.to_dict(),
        'stock_info': stock_info,
        'is_embedded': filing.is_embedded,
        'embedding_in_progress': not filing.is_embedded
    })


@api_bp.route('/chats', methods=['GET'])
@login_required
def list_chats():
    """List all chats for current user"""
    chats = Chat.query.filter_by(user_id=current_user.id).order_by(Chat.created_at.desc()).all()

    return jsonify([{
        'id': chat.id,
        'ticker': chat.ticker,
        'filing': chat.filing.to_dict() if chat.filing else None,
        'created_at': chat.created_at.isoformat() if chat.created_at else None,
        'message_count': len(chat.messages),
        'has_report': chat.generated_report is not None
    } for chat in chats])


@api_bp.route('/chats/<chat_id>', methods=['GET'])
@login_required
def get_chat(chat_id):
    """Get a specific chat"""
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400

    chat = Chat.query.get(chat_id)

    if not chat:
        return jsonify({'error': 'Chat not found'}), 404

    if chat.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403

    return jsonify(chat.to_dict())


@api_bp.route('/chats/<chat_id>/ask', methods=['POST'])
@login_required
def ask_question(chat_id):
    """Ask a question using RAG"""
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400

    chat = Chat.query.get(chat_id)

    if not chat:
        return jsonify({'error': 'Chat not found'}), 404

    if chat.user_id != current_user.id:
        return jsonify({'error': 'Access denied'}), 403

    if not chat.filing or not chat.filing.is_embedded:
        return jsonify({'error': 'Filing not yet processed. Please wait for embedding to complete.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400

    question = sanitize_string(data.get('question', ''), max_length=5000)

    if not question:
        return jsonify({'error': 'Question is required'}), 400

    namespace = chat.filing.get_namespace()
    retrieved_chunks = vector_service.query(question, namespace, top_k=Config.RETRIEVAL_TOP_K)

    if not retrieved_chunks:
        return jsonify({'error': 'No relevant context found'}), 400

    conversation_history = chat.get_conversation_history(limit=5)

    filing_metadata = chat.filing.to_dict()

    answer = llm_service.ask_question_rag(
        query=question,
        retrieved_chunks=retrieved_chunks,
        conversation_history=conversation_history,
        filing_metadata=filing_metadata
    )

    if not answer:
        return jsonify({'error': 'Failed to generate answer'}), 500

    message = chat.add_message(question, answer)

    return jsonify(message.to_dict())


@api_bp.route('/chats/<chat_id>/generate-report', methods=['POST'])
@login_required
def generate_report(chat_id):
    """Generate a comprehensive report using RAG"""
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400

    chat = Chat.query.get(chat_id)

    if not chat:
        return jsonify({'error': 'Chat not found'}), 404

    if chat.user_id != current_user.id:
        return jsonify({'error': 'Access denied'}), 403

    if not chat.filing or not chat.filing.is_embedded:
        return jsonify({'error': 'Filing not yet processed'}), 400

    namespace = chat.filing.get_namespace()

    report_queries = [
        ("Financial Performance", "revenue earnings profit margin EPS financial performance"),
        ("Balance Sheet", "assets liabilities equity debt balance sheet"),
        ("Cash Flow", "cash flow operating investing financing free cash flow"),
        ("Risk Factors", "risk factors challenges threats"),
        ("Management Discussion", "management discussion outlook guidance future"),
    ]

    section_contexts = {}
    for section_name, query in report_queries:
        chunks = vector_service.query(query, namespace, top_k=3)
        section_contexts[section_name] = chunks

    filing_metadata = chat.filing.to_dict()

    report = llm_service.generate_report_rag(
        filing_metadata=filing_metadata,
        section_contexts=section_contexts,
        stock_info=chat.stock_info
    )

    if not report:
        return jsonify({'error': 'Failed to generate report'}), 500

    chat.set_report(report)
    message = chat.add_message("Generate comprehensive report", report)

    return jsonify({
        'message': message.to_dict(),
        'report': report,
        'report_generated_at': chat.report_generated_at.isoformat() if chat.report_generated_at else None
    })


@api_bp.route('/chats/<chat_id>/report', methods=['GET'])
@login_required
def get_report(chat_id):
    """Get the generated report for a chat"""
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400

    chat = Chat.query.get(chat_id)

    if not chat:
        return jsonify({'error': 'Chat not found'}), 404

    if chat.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403

    if not chat.generated_report:
        return jsonify({'error': 'No report generated for this chat'}), 404

    return jsonify({
        'report': chat.generated_report,
        'report_generated_at': chat.report_generated_at.isoformat() if chat.report_generated_at else None,
        'ticker': chat.ticker,
        'filing': chat.filing.to_dict() if chat.filing else None
    })


@api_bp.route('/chats/<chat_id>', methods=['DELETE'])
@login_required
def delete_chat(chat_id):
    """Delete a chat"""
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400

    chat = Chat.query.get(chat_id)

    if not chat:
        return jsonify({'error': 'Chat not found'}), 404

    if chat.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403

    db.session.delete(chat)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Chat deleted successfully'})


# Waitlist endpoint

@api_bp.route('/waitlist', methods=['POST'])
def add_to_waitlist():
    """Add email to waitlist"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400

    email = sanitize_string(data.get('email', ''), max_length=255)

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({'error': 'Invalid email format'}), 400

    try:
        existing = WaitlistEmail.query.filter_by(email=email).first()
        if existing:
            return jsonify({'success': True, 'message': 'Email already in waitlist'}), 200

        waitlist_email = WaitlistEmail(email=email)
        db.session.add(waitlist_email)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Email added to waitlist successfully'}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding email to waitlist: {e}")
        return jsonify({'error': 'Failed to add email to waitlist'}), 500


# Stock info endpoint

@api_bp.route('/stock/<ticker>', methods=['GET'])
@login_required
def get_stock_info(ticker):
    """Get stock information for a ticker"""
    ticker = ticker.strip().upper()

    if not validate_ticker(ticker):
        return jsonify({'error': 'Invalid ticker symbol'}), 400

    stock_info = stock_service.get_stock_info(ticker)

    if not stock_info:
        return jsonify({'error': 'Failed to fetch stock information'}), 404

    return jsonify(stock_info)
