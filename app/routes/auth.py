import re
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.user import User, InviteCode
from app.utils.config import Config

auth_bp = Blueprint('auth', __name__)


def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password(password: str) -> tuple[bool, str]:
    if len(password) < Config.PASSWORD_MIN_LENGTH:
        return False, f'Password must be at least {Config.PASSWORD_MIN_LENGTH} characters'
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter'
    if not re.search(r'\d', password):
        return False, 'Password must contain at least one number'
    return True, ''


@auth_bp.route('/login', methods=['GET'])
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('auth/login.html')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Your account has been deactivated'}), 401

    login_user(user, remember=True)
    user.update_last_login()

    return jsonify({
        'success': True,
        'user': user.to_dict()
    })


@auth_bp.route('/register', methods=['GET'])
def register_page():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('auth/register.html')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400

    invite_code_str = data.get('invite_code', '').strip().upper()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not all([invite_code_str, email, password, confirm_password]):
        return jsonify({'error': 'All fields are required'}), 400

    invite_code = InviteCode.query.filter_by(code=invite_code_str).first()
    if not invite_code or not invite_code.is_valid():
        return jsonify({'error': 'Invalid or expired invite code'}), 400

    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400

    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match'}), 400

    is_valid, error_msg = validate_password(password)
    if not is_valid:
        return jsonify({'error': error_msg}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'An account with this email already exists'}), 400

    user = User(
        email=email,
        invite_code_id=invite_code.id
    )
    user.set_password(password)

    invite_code.use()

    db.session.add(user)
    db.session.commit()

    login_user(user, remember=True)
    user.update_last_login()

    return jsonify({
        'success': True,
        'user': user.to_dict()
    }), 201


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({
        'user': current_user.to_dict()
    })


@auth_bp.route('/check', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': current_user.to_dict()
        })
    return jsonify({'authenticated': False})
