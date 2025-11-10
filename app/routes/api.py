from flask import Blueprint, jsonify, request
import os
from app.models.chat import Chat, chats
from app.services.sec_service import sec_service
from app.services.stock_service import stock_service
from app.services.pdf_service import pdf_service
from app.services.llm_service import llm_service
from app.utils.config import Config

api_bp = Blueprint('api', __name__)

@api_bp.route('/pdfs', methods=['GET'])
def list_pdfs():
    pdfs = []
    if os.path.exists(Config.DOWNLOADS_DIR):
        pdfs = [f for f in os.listdir(Config.DOWNLOADS_DIR) if f.endswith('.pdf')]
    return jsonify(pdfs)

@api_bp.route('/create-chat', methods=['POST'])
def create_chat():
    data = request.get_json()
    ticker = data.get('ticker', '').strip().upper()
    
    if not ticker:
        return jsonify({'error': 'Ticker is required'}), 400
    
    stock_info = stock_service.get_stock_info(ticker)
    if not stock_info:
        return jsonify({'error': f'Failed to fetch stock information for {ticker}'}), 400
    
    filename = f"{ticker}_latest_10Q.pdf"
    filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
    
    pdf_text = None
    if os.path.exists(filepath):
        print(f"PDF exists, extracting text from: {filename}")
        pdf_text = pdf_service.extract_text(filename)
    else:
        if Config.SEC_API_KEY:
            print(f"PDF not found, downloading for {ticker}...")
            filing_url = sec_service.get_latest_10q_url(ticker)
            if filing_url:
                result = sec_service.download_pdf(filing_url, ticker)
                if result:
                    print(f"PDF downloaded, extracting text from: {result}")
                    pdf_text = pdf_service.extract_text(result)
            else:
                print(f"No filing URL found for {ticker}")
        else:
            print("SEC_API_KEY not configured")
    
    if pdf_text:
        print(f"PDF text extracted successfully, length: {len(pdf_text)} characters")
        print(f"First 200 chars: {pdf_text[:200]}")
    else:
        print(f"WARNING: No PDF text extracted for {ticker}")
    
    chat = Chat(ticker=ticker, stock_info=stock_info, pdf_text=pdf_text)
    
    if pdf_text and llm_service.client:
        print(f"Preparing PDF for chat {chat.id}, length: {len(pdf_text)} characters")
        pdf_data = llm_service.ingest_pdf(pdf_text)
        if pdf_data:
            chat.conversation_messages = pdf_data
            print(f"PDF prepared successfully")
        else:
            print(f"WARNING: Failed to prepare PDF")
    
    chats[chat.id] = chat
    
    pdf_exists = os.path.exists(filepath)
    
    return jsonify({
        'chat_id': chat.id,
        'ticker': ticker,
        'stock_info': stock_info,
        'has_pdf': pdf_text is not None,
        'pdf_text_length': len(pdf_text) if pdf_text else 0,
        'pdf_filename': filename if pdf_exists else None
    })

@api_bp.route('/chats', methods=['GET'])
def list_chats():
    return jsonify([{
        'id': chat.id,
        'ticker': chat.ticker,
        'created_at': chat.created_at,
        'stock_info': chat.stock_info
    } for chat in chats.values()])

@api_bp.route('/chats/<chat_id>', methods=['GET'])
def get_chat(chat_id):
    if chat_id not in chats:
        return jsonify({'error': 'Chat not found'}), 404
    
    chat = chats[chat_id]
    response_data = chat.to_dict()
    if response_data.get('pdf_text'):
        response_data['pdf_text_length'] = len(response_data['pdf_text'])
        response_data['pdf_text_preview'] = response_data['pdf_text'][:500]
    
    filename = f"{chat.ticker}_latest_10Q.pdf"
    filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
    if os.path.exists(filepath):
        response_data['pdf_filename'] = filename
    
    return jsonify(response_data)

@api_bp.route('/chats/<chat_id>/ask', methods=['POST'])
def ask_question(chat_id):
    if chat_id not in chats:
        return jsonify({'error': 'Chat not found'}), 404
    
    data = request.get_json()
    question = data.get('question', '').strip()
    
    if not question:
        return jsonify({'error': 'Question is required'}), 400
    
    chat = chats[chat_id]
    
    if not chat.pdf_text:
        return jsonify({'error': 'PDF text not available for this ticker. Please ensure the PDF was downloaded and extracted properly.'}), 400
    
    if not llm_service.client:
        return jsonify({'error': 'OpenAI API key not configured'}), 500
    
    print(f"Question: {question}")
    print(f"PDF text length: {len(chat.pdf_text)} characters")
    print(f"Previous Q&A pairs: {len(chat.messages)}")
    
    previous_qa = [{"question": msg["question"], "answer": msg["answer"]} for msg in chat.messages]
    
    answer = llm_service.ask_question(chat.pdf_text, question, previous_qa)
    
    if not answer:
        return jsonify({'error': 'Failed to get answer from LLM'}), 500
    
    message = chat.add_message(question, answer)
    return jsonify(message)

@api_bp.route('/download-pdf', methods=['POST'])
def download_pdf_api():
    data = request.get_json()
    ticker = data.get('ticker', '').strip().upper()
    
    if not ticker:
        return jsonify({'error': 'Ticker is required'}), 400
    
    filename = f"{ticker}_latest_10Q.pdf"
    filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
    
    if os.path.exists(filepath):
        return jsonify({'filename': filename, 'message': 'PDF already exists'})
    
    if not Config.SEC_API_KEY:
        return jsonify({'error': 'API key not configured'}), 500
    
    filing_url = sec_service.get_latest_10q_url(ticker)
    if not filing_url:
        return jsonify({'error': f'No 10-Q filings found for ticker {ticker}'}), 404
    
    result = sec_service.download_pdf(filing_url, ticker)
    if result:
        return jsonify({'filename': result, 'message': 'PDF downloaded successfully'})
    else:
        return jsonify({'error': 'Failed to download PDF'}), 500

