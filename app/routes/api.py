import os
from flask import Blueprint, jsonify, request
from app.models.chat import Chat, chats
from app.services.stock_service import stock_service
from app.services.sec_service import sec_service
from app.services.pdf_service import pdf_service
from app.services.llm_service import llm_service
from app.utils.config import Config

api_bp = Blueprint('api', __name__)

@api_bp.route('/create-chat', methods=['POST'])
def create_chat():
    data = request.get_json()
    ticker = data.get('ticker', '').strip().upper()
    
    if not ticker:
        return jsonify({'error': 'Ticker is required'}), 400
    
    stock_info = stock_service.get_stock_info(ticker)
    if not stock_info:
        return jsonify({'error': f'Failed to fetch stock information for {ticker}'}), 400
    
    pdf_text = None
    filename = f"{ticker}_latest_10Q.pdf"
    filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
    
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
                    print(f"Failed to download PDF for {ticker}")
            else:
                print(f"No filing URL found for {ticker}")
        else:
            print("SEC_API_KEY not configured")
    
    if pdf_text:
        print(f"PDF text extracted successfully, length: {len(pdf_text)} characters")
        print(f"First 200 chars: {pdf_text[:200]}")
    else:
        print(f"WARNING: No PDF text extracted for {ticker}")
    
    pdf_exists = os.path.exists(filepath)
    
    chat = Chat(ticker=ticker, stock_info=stock_info, pdf_text=pdf_text)
    
    if pdf_text:
        chat.get_pdf_message(is_continuation=False)
        print(f"PDF message pre-cached for LLM, ready to answer questions")
    
    chats[chat.id] = chat
    
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
        return jsonify({'error': 'PDF text not available for this ticker.'}), 400
    
    if not llm_service.client:
        return jsonify({'error': 'OpenAI API key not configured'}), 500
    
    print(f"Question: {question}")
    print(f"Previous Q&A pairs: {len(chat.messages)}")
    
    previous_qa = [{"question": msg["question"], "answer": msg["answer"]} for msg in chat.messages]
    cached_pdf_message = chat.get_pdf_message(is_continuation=len(chat.messages) > 0)
    answer = llm_service.ask_question(chat.pdf_text, question, previous_qa, cached_pdf_message=cached_pdf_message)
    
    if not answer:
        return jsonify({'error': 'Failed to get answer from LLM'}), 500
    
    message = chat.add_message(question, answer)
    return jsonify(message)

@api_bp.route('/chats/<chat_id>/generate-report', methods=['POST'])
def generate_report(chat_id):
    if chat_id not in chats:
        return jsonify({'error': 'Chat not found'}), 404
    
    chat = chats[chat_id]
    
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
        'message': message,
        'report': report,
        'report_generated_at': chat.report_generated_at
    })

@api_bp.route('/chats/<chat_id>/report', methods=['GET'])
def get_report(chat_id):
    if chat_id not in chats:
        return jsonify({'error': 'Chat not found'}), 404
    
    chat = chats[chat_id]
    
    if not chat.generated_report:
        return jsonify({'error': 'No report generated for this chat'}), 404
    
    return jsonify({
        'report': chat.generated_report,
        'report_generated_at': chat.report_generated_at,
        'ticker': chat.ticker,
        'stock_info': chat.stock_info
    })

