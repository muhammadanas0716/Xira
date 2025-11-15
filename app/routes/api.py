import os
import re
import uuid
import threading
from datetime import datetime, date
from flask import Blueprint, jsonify, request, session, current_app
from app import db
from app.models.chat import Chat, Message, TickerPDF
from app.services.stock_service import stock_service
from app.services.sec_service import sec_service
from app.services.pdf_service import pdf_service
from app.services.llm_service import llm_service
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

def parse_filing_date(filed_at_str):
    if not filed_at_str:
        return None
    try:
        if isinstance(filed_at_str, str):
            if 'T' in filed_at_str:
                return datetime.fromisoformat(filed_at_str.replace('Z', '+00:00')).date()
            else:
                return datetime.strptime(filed_at_str, '%Y-%m-%d').date()
        return None
    except Exception as e:
        print(f"Error parsing filing date {filed_at_str}: {e}")
        return None

def get_latest_filing_date_for_ticker(ticker):
    latest_pdf = TickerPDF.query.filter_by(ticker=ticker).order_by(TickerPDF.filing_date.desc()).first()
    return latest_pdf.filing_date if latest_pdf else None

def download_and_extract_pdf_background(chat_id, ticker, app):
    try:
        if not Config.SEC_API_KEY:
            print("SEC_API_KEY not configured")
            return
        
        print(f"Checking for latest 10-Q filing for {ticker}...")
        filing_info = sec_service.get_latest_10q_url(ticker)
        
        if not filing_info or not filing_info.get('url'):
            print(f"No filing URL found for {ticker}")
            return
        
        filing_date = parse_filing_date(filing_info.get('filed_at'))
        if not filing_date:
            print(f"Could not parse filing date for {ticker}")
            return
        
        print(f"Latest filing date for {ticker}: {filing_date}")
        
        with app.app_context():
            existing_pdf = TickerPDF.query.filter_by(ticker=ticker, filing_date=filing_date).first()
            
            if existing_pdf:
                print(f"PDF for {ticker} with filing date {filing_date} already exists")
                chat = Chat.query.get(chat_id)
                if chat and not chat.filing_date:
                    chat.filing_date = filing_date
                    db.session.commit()
                return
            
            latest_existing_date = get_latest_filing_date_for_ticker(ticker)
            if latest_existing_date and filing_date <= latest_existing_date:
                print(f"Filing date {filing_date} is not newer than existing {latest_existing_date}")
                chat = Chat.query.get(chat_id)
                if chat and not chat.filing_date:
                    chat.filing_date = latest_existing_date
                    db.session.commit()
                return
        
        filing_url = filing_info['url']
        print(f"Downloading PDF for {ticker} from {filing_url}...")
        
        filename = f"{ticker}_{filing_date}_10Q.pdf"
        
        result = sec_service.download_pdf(filing_url, ticker, filename)
        if not result:
            print(f"Failed to download PDF for {ticker}")
            return
        
        pdf_text = pdf_service.extract_text(result)
        if not pdf_text:
            print(f"Failed to extract text from PDF for {ticker}")
            return
        
        print(f"PDF text extracted successfully, length: {len(pdf_text)} characters")
        
        with app.app_context():
            period_end_date = None
            if filing_info.get('period_end_date'):
                period_end_date = parse_filing_date(filing_info['period_end_date'])
            
            filed_at_dt = None
            if filing_info.get('filed_at'):
                try:
                    filed_at_str = filing_info['filed_at']
                    if 'T' in filed_at_str:
                        filed_at_dt = datetime.fromisoformat(filed_at_str.replace('Z', '+00:00'))
                    else:
                        filed_at_dt = datetime.strptime(filed_at_str, '%Y-%m-%d')
                except Exception as e:
                    print(f"Error parsing filed_at datetime: {e}")
            
            ticker_pdf = TickerPDF(
                ticker=ticker,
                filing_date=filing_date,
                pdf_text=pdf_text,
                pdf_filename=result,
                filed_at=filed_at_dt,
                period_end_date=period_end_date,
                accession_number=filing_info.get('accession_number')
            )
            db.session.add(ticker_pdf)
            
            chat = Chat.query.get(chat_id)
            if chat:
                chat.filing_date = filing_date
                db.session.commit()
                chat.get_pdf_message(is_continuation=False)
                print(f"PDF message pre-cached for LLM, ready to answer questions")
            else:
                db.session.commit()
    except Exception as e:
        print(f"Error in background PDF download: {e}")
        import traceback
        traceback.print_exc()

@api_bp.route('/create-chat', methods=['POST'])
def create_chat():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    ticker = data.get('ticker', '').strip().upper()
    
    if not validate_ticker(ticker):
        return jsonify({'error': 'Invalid ticker symbol'}), 400
    
    stock_info = stock_service.get_stock_info(ticker)
    if not stock_info:
        return jsonify({'error': 'Failed to fetch stock information'}), 400
    
    filing_date = None
    ticker_pdf = None
    pdf_text = None
    
    if Config.SEC_API_KEY:
        filing_info = sec_service.get_latest_10q_url(ticker)
        if filing_info and filing_info.get('url'):
            filing_date = parse_filing_date(filing_info.get('filed_at'))
            if filing_date:
                ticker_pdf = TickerPDF.query.filter_by(ticker=ticker, filing_date=filing_date).first()
                if ticker_pdf:
                    pdf_text = ticker_pdf.pdf_text
                    print(f"Using existing PDF text for {ticker} (filing date: {filing_date})")
    
    if not ticker_pdf:
        latest_pdf = TickerPDF.query.filter_by(ticker=ticker).order_by(TickerPDF.filing_date.desc()).first()
        if latest_pdf:
            ticker_pdf = latest_pdf
            filing_date = latest_pdf.filing_date
            pdf_text = latest_pdf.pdf_text
            print(f"Using latest existing PDF for {ticker} (filing date: {filing_date})")
    
    chat = Chat(
        ticker=ticker,
        filing_date=filing_date,
        stock_info=stock_info
    )
    
    db.session.add(chat)
    db.session.commit()
    
    if pdf_text:
        chat.get_pdf_message(is_continuation=False)
        print(f"PDF message pre-cached for LLM, ready to answer questions")
    else:
        print(f"Starting background PDF download for {ticker}...")
        thread = threading.Thread(target=download_and_extract_pdf_background, args=(chat.id, ticker, current_app._get_current_object()))
        thread.daemon = True
        thread.start()
    
    pdf_filename = ticker_pdf.pdf_filename if ticker_pdf else None
    
    return jsonify({
        'chat_id': chat.id,
        'ticker': ticker,
        'filing_date': filing_date.isoformat() if filing_date else None,
        'stock_info': stock_info,
        'has_pdf': pdf_text is not None,
        'pdf_text_length': len(pdf_text) if pdf_text else 0,
        'pdf_filename': pdf_filename,
        'pdf_downloading': not pdf_text and Config.SEC_API_KEY is not None
    })

@api_bp.route('/chats', methods=['GET'])
def list_chats():
    chats = Chat.query.order_by(Chat.created_at.desc()).all()
    return jsonify([{
        'id': chat.id,
        'ticker': chat.ticker,
        'created_at': chat.created_at.isoformat() if chat.created_at else None,
        'stock_info': chat.stock_info
    } for chat in chats])

@api_bp.route('/chats/<chat_id>', methods=['GET'])
def get_chat(chat_id):
    if not chat_id or len(chat_id) > 100:
        return jsonify({'error': 'Invalid chat ID'}), 400
    
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400
    
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    
    response_data = chat.to_dict()
    if response_data.get('pdf_text'):
        response_data['pdf_text_length'] = len(response_data['pdf_text'])
        response_data['pdf_text_preview'] = response_data['pdf_text'][:500]
        del response_data['pdf_text']
    
    ticker_pdf = chat.ticker_pdf
    if ticker_pdf and ticker_pdf.pdf_filename:
        response_data['pdf_filename'] = ticker_pdf.pdf_filename
    elif chat.filing_date:
        filename = f"{chat.ticker}_{chat.filing_date}_10Q.pdf"
        filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
        if os.path.exists(filepath):
            response_data['pdf_filename'] = filename
    
    return jsonify(response_data)

@api_bp.route('/chats/<chat_id>/ask', methods=['POST'])
def ask_question(chat_id):
    if not chat_id or len(chat_id) > 100:
        return jsonify({'error': 'Invalid chat ID'}), 400
    
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400
    
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    question = sanitize_string(data.get('question', ''), max_length=5000)
    
    if not question:
        return jsonify({'error': 'Question is required'}), 400
    
    if not chat.pdf_text:
        return jsonify({'error': 'PDF text not available for this ticker.'}), 400
    
    if not llm_service.client:
        return jsonify({'error': 'OpenAI API key not configured'}), 500
    
    print(f"Question: {question}")
    print(f"Previous Q&A pairs: {len(chat.messages)}")
    
    previous_qa = [{"question": msg.question, "answer": msg.answer} for msg in chat.messages]
    cached_pdf_message = chat.get_pdf_message(is_continuation=len(chat.messages) > 0)
    answer = llm_service.ask_question(chat.pdf_text, question, previous_qa, cached_pdf_message=cached_pdf_message)
    
    if not answer:
        return jsonify({'error': 'Failed to get answer from LLM'}), 500
    
    message = chat.add_message(question, answer)
    return jsonify(message.to_dict())

@api_bp.route('/chats/<chat_id>/generate-report', methods=['POST'])
def generate_report(chat_id):
    if not chat_id or len(chat_id) > 100:
        return jsonify({'error': 'Invalid chat ID'}), 400
    
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400
    
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    
    if not chat.pdf_text:
        return jsonify({'error': 'PDF text not available for this ticker.'}), 400
    
    if not llm_service.client:
        return jsonify({'error': 'OpenAI API key not configured'}), 500
    
    print(f"Generating report for chat {chat_id}, ticker: {chat.ticker}")
    print(f"PDF text length: {len(chat.pdf_text)} characters")
    
    report = llm_service.generate_report(chat.pdf_text, chat.ticker, chat.stock_info)
    
    if not report:
        return jsonify({'error': 'Failed to generate report from LLM'}), 500
    
    chat.set_report(report)
    message = chat.add_message("Generate comprehensive report", report)
    
    return jsonify({
        'message': message.to_dict(),
        'report': report,
        'report_generated_at': chat.report_generated_at.isoformat() if chat.report_generated_at else None
    })

@api_bp.route('/chats/<chat_id>/report', methods=['GET'])
def get_report(chat_id):
    if not chat_id or len(chat_id) > 100:
        return jsonify({'error': 'Invalid chat ID'}), 400
    
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400
    
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    
    if not chat.generated_report:
        return jsonify({'error': 'No report generated for this chat'}), 404
    
    return jsonify({
        'report': chat.generated_report,
        'report_generated_at': chat.report_generated_at.isoformat() if chat.report_generated_at else None,
        'ticker': chat.ticker,
        'stock_info': chat.stock_info
    })

@api_bp.route('/validate-dashboard-pin', methods=['POST'])
def validate_dashboard_pin():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    pin = sanitize_string(data.get('pin', ''), max_length=20)
    
    if not pin:
        return jsonify({'error': 'PIN is required'}), 400
    
    if pin == Config.DASHBOARD_PIN:
        session['dashboard_authenticated'] = True
        session.permanent = True
        return jsonify({'success': True, 'message': 'PIN validated successfully'})
    else:
        return jsonify({'error': 'Invalid PIN'}), 401

@api_bp.route('/chats/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    if not chat_id or len(chat_id) > 100:
        return jsonify({'error': 'Invalid chat ID'}), 400
    
    try:
        uuid.UUID(chat_id)
    except ValueError:
        return jsonify({'error': 'Invalid chat ID format'}), 400
    
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    
    db.session.delete(chat)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Chat deleted successfully'})

@api_bp.route('/chats', methods=['DELETE'])
def delete_all_chats():
    try:
        count = Chat.query.count()
        Chat.query.delete()
        db.session.commit()
        return jsonify({'success': True, 'message': f'All {count} chats deleted successfully'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting all chats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete all chats'}), 500
