import csv
import io
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, render_template, jsonify, request, Response
from flask_login import login_required, current_user
from app import db
from app.models.chat import Chat, Message, SECFiling
from app.models.waitlist import WaitlistEmail
from app.models.user import User, InviteCode

admin_bp = Blueprint('admin', __name__)


def admin_required(f):
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


@admin_bp.route('/admin')
@login_required
def admin_page():
    if not current_user.is_admin:
        return render_template('404.html'), 404
    return render_template('admin.html')


# Stats endpoints

@admin_bp.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_stats():
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = User.query.count()
    total_waitlist = WaitlistEmail.query.count()
    total_chats = Chat.query.count()
    total_messages = Message.query.count()
    total_filings = SECFiling.query.count()
    embedded_filings = SECFiling.query.filter_by(is_embedded=True).count()

    users_today = User.query.filter(User.created_at >= today_start).count()
    waitlist_today = WaitlistEmail.query.filter(WaitlistEmail.created_at >= today_start).count()
    chats_today = Chat.query.filter(Chat.created_at >= today_start).count()
    messages_today = Message.query.filter(Message.created_at >= today_start).count()

    return jsonify({
        'users': {'total': total_users, 'today': users_today},
        'waitlist': {'total': total_waitlist, 'today': waitlist_today},
        'chats': {'total': total_chats, 'today': chats_today},
        'messages': {'total': total_messages, 'today': messages_today},
        'filings': {'total': total_filings, 'embedded': embedded_filings}
    })


# User management

@admin_bp.route('/api/admin/users', methods=['GET'])
@admin_required
def get_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    pagination = User.query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    users = [{
        'id': user.id,
        'email': user.email,
        'is_active': user.is_active,
        'is_admin': user.is_admin,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'chat_count': user.chats.count()
    } for user in pagination.items]

    return jsonify({
        'users': users,
        'pagination': {
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })


@admin_bp.route('/api/admin/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.id == current_user.id:
        return jsonify({'error': 'Cannot modify your own account'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400

    if 'is_active' in data:
        user.is_active = bool(data['is_active'])

    if 'is_admin' in data:
        user.is_admin = bool(data['is_admin'])

    db.session.commit()

    return jsonify({'success': True, 'user': user.to_dict()})


@admin_bp.route('/api/admin/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.id == current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({'success': True, 'message': 'User deleted'})


# Invite code management

@admin_bp.route('/api/admin/invite-codes', methods=['GET'])
@admin_required
def get_invite_codes():
    codes = InviteCode.query.order_by(InviteCode.created_at.desc()).all()
    return jsonify([code.to_dict() for code in codes])


@admin_bp.route('/api/admin/invite-codes', methods=['POST'])
@admin_required
def create_invite_code():
    data = request.get_json() or {}

    max_uses = data.get('max_uses', 1)
    expires_days = data.get('expires_days')

    expires_at = None
    if expires_days:
        expires_at = datetime.utcnow() + timedelta(days=int(expires_days))

    code = InviteCode.create(
        created_by=current_user,
        max_uses=max_uses,
        expires_at=expires_at
    )

    return jsonify({'success': True, 'invite_code': code.to_dict()}), 201


@admin_bp.route('/api/admin/invite-codes/<code_id>', methods=['DELETE'])
@admin_required
def delete_invite_code(code_id):
    code = InviteCode.query.get(code_id)
    if not code:
        return jsonify({'error': 'Invite code not found'}), 404

    db.session.delete(code)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Invite code deleted'})


# Waitlist management

@admin_bp.route('/api/admin/waitlist', methods=['GET'])
@admin_required
def get_waitlist():
    emails = WaitlistEmail.query.order_by(WaitlistEmail.created_at.desc()).all()
    return jsonify([{
        'id': email.id,
        'email': email.email,
        'created_at': email.created_at.isoformat() if email.created_at else None
    } for email in emails])


@admin_bp.route('/api/admin/waitlist/csv', methods=['GET'])
@admin_required
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


# Message management

@admin_bp.route('/api/admin/messages', methods=['GET'])
@admin_required
def get_messages():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    pagination = Message.query.order_by(Message.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    messages = []
    for msg in pagination.items:
        chat = Chat.query.get(msg.chat_id)
        user = User.query.get(chat.user_id) if chat else None
        messages.append({
            'id': msg.id,
            'chat_id': msg.chat_id,
            'ticker': chat.ticker if chat else 'N/A',
            'user_email': user.email if user else 'N/A',
            'question': msg.question[:200] + '...' if len(msg.question) > 200 else msg.question,
            'answer': msg.answer[:200] + '...' if len(msg.answer) > 200 else msg.answer,
            'created_at': msg.created_at.isoformat() if msg.created_at else None
        })

    return jsonify({
        'messages': messages,
        'pagination': {
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })


@admin_bp.route('/api/admin/messages/<message_id>', methods=['GET'])
@admin_required
def get_message_detail(message_id):
    msg = Message.query.get(message_id)
    if not msg:
        return jsonify({'error': 'Message not found'}), 404

    chat = Chat.query.get(msg.chat_id)
    user = User.query.get(chat.user_id) if chat else None

    return jsonify({
        'id': msg.id,
        'chat_id': msg.chat_id,
        'ticker': chat.ticker if chat else 'N/A',
        'user_email': user.email if user else 'N/A',
        'question': msg.question,
        'answer': msg.answer,
        'created_at': msg.created_at.isoformat() if msg.created_at else None
    })


@admin_bp.route('/api/admin/messages/csv', methods=['GET'])
@admin_required
def download_messages_csv():
    messages = Message.query.order_by(Message.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Chat ID', 'Ticker', 'User', 'Question', 'Answer', 'Created At'])

    for msg in messages:
        chat = Chat.query.get(msg.chat_id)
        user = User.query.get(chat.user_id) if chat else None
        writer.writerow([
            msg.id,
            msg.chat_id,
            chat.ticker if chat else 'N/A',
            user.email if user else 'N/A',
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


# Filings management

@admin_bp.route('/api/admin/filings', methods=['GET'])
@admin_required
def get_filings():
    filings = SECFiling.query.order_by(SECFiling.created_at.desc()).all()
    return jsonify([filing.to_dict() for filing in filings])
