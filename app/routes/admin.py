import csv
import io
from datetime import datetime
from flask import Blueprint, render_template, jsonify, request, session, Response
from app import db
from app.models.chat import Chat, Message
from app.models.waitlist import WaitlistEmail
from app.utils.config import Config

admin_bp = Blueprint('admin', __name__)

def require_admin_auth(f):
    def decorated_function(*args, **kwargs):
        if not session.get('admin_authenticated', False):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@admin_bp.route('/admin')
def admin_page():
    if not session.get('admin_authenticated', False):
        return render_template('admin.html', show_pin_modal=True)
    return render_template('admin.html', show_pin_modal=False)

@admin_bp.route('/api/admin/validate-pin', methods=['POST'])
def validate_admin_pin():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    pin = data.get('pin', '').strip()
    
    if not pin:
        return jsonify({'error': 'PIN is required'}), 400
    
    if pin == Config.DASHBOARD_PIN:
        session['admin_authenticated'] = True
        session.permanent = True
        return jsonify({'success': True, 'message': 'PIN validated successfully'})
    else:
        return jsonify({'error': 'Invalid PIN'}), 401

@admin_bp.route('/api/admin/stats', methods=['GET'])
@require_admin_auth
def get_stats():
    total_waitlist = WaitlistEmail.query.count()
    total_chats = Chat.query.count()
    total_messages = Message.query.count()
    
    recent_waitlist = WaitlistEmail.query.filter(
        WaitlistEmail.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    recent_chats = Chat.query.filter(
        Chat.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    recent_messages = Message.query.filter(
        Message.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    return jsonify({
        'waitlist': {
            'total': total_waitlist,
            'today': recent_waitlist
        },
        'chats': {
            'total': total_chats,
            'today': recent_chats
        },
        'messages': {
            'total': total_messages,
            'today': recent_messages
        }
    })

@admin_bp.route('/api/admin/waitlist', methods=['GET'])
@require_admin_auth
def get_waitlist():
    emails = WaitlistEmail.query.order_by(WaitlistEmail.created_at.desc()).all()
    return jsonify([{
        'id': email.id,
        'email': email.email,
        'created_at': email.created_at.isoformat() if email.created_at else None
    } for email in emails])

@admin_bp.route('/api/admin/waitlist/csv', methods=['GET'])
@require_admin_auth
def download_waitlist_csv():
    emails = WaitlistEmail.query.order_by(WaitlistEmail.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Email', 'Created At'])
    
    for email in emails:
        writer.writerow([
            email.id,
            email.email,
            email.created_at.isoformat() if email.created_at else ''
        ])
    
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename=waitlist_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'
        }
    )

@admin_bp.route('/api/admin/messages', methods=['GET'])
@require_admin_auth
def get_messages():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    pagination = Message.query.order_by(Message.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    messages = []
    for msg in pagination.items:
        chat = Chat.query.get(msg.chat_id)
        messages.append({
            'id': msg.id,
            'chat_id': msg.chat_id,
            'ticker': chat.ticker if chat else 'N/A',
            'question': msg.question,
            'answer': msg.answer,
            'created_at': msg.created_at.isoformat() if msg.created_at else None
        })
    
    return jsonify({
        'messages': messages,
        'pagination': {
            'page': pagination.page,
            'pages': pagination.pages,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })

@admin_bp.route('/api/admin/messages/csv', methods=['GET'])
@require_admin_auth
def download_messages_csv():
    messages = Message.query.order_by(Message.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Chat ID', 'Ticker', 'Question', 'Answer', 'Created At'])
    
    for msg in messages:
        chat = Chat.query.get(msg.chat_id)
        ticker = chat.ticker if chat else 'N/A'
        writer.writerow([
            msg.id,
            msg.chat_id,
            ticker,
            msg.question[:500] + '...' if len(msg.question) > 500 else msg.question,
            msg.answer[:500] + '...' if len(msg.answer) > 500 else msg.answer,
            msg.created_at.isoformat() if msg.created_at else ''
        ])
    
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename=messages_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'
        }
    )

