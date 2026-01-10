import os
import re
from flask import Blueprint, render_template, send_from_directory, Response, make_response, request, redirect, url_for
from flask_login import login_required, current_user
from app.utils.config import Config

main_bp = Blueprint('main', __name__)


def sanitize_filename(filename):
    filename = os.path.basename(filename)
    if not re.match(r'^[A-Z0-9_-]+\.pdf$', filename, re.IGNORECASE):
        return None
    return filename


@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('landing.html')


@main_bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('index.html')


@main_bp.route('/pdfs/<filename>')
@login_required
def serve_pdf(filename):
    sanitized = sanitize_filename(filename)
    if not sanitized:
        return Response('Invalid filename', status=400, mimetype='text/plain')

    filepath = os.path.join(Config.DOWNLOADS_DIR, sanitized)

    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        return Response('PDF not found', status=404, mimetype='text/plain')

    real_path = os.path.realpath(filepath)
    downloads_real = os.path.realpath(Config.DOWNLOADS_DIR)
    if not real_path.startswith(downloads_real):
        return Response('Access denied', status=403, mimetype='text/plain')

    response = make_response(send_from_directory(
        Config.DOWNLOADS_DIR,
        sanitized,
        mimetype='application/pdf',
        as_attachment=False
    ))

    origin = request.headers.get('Origin')
    if origin and origin.startswith(('http://localhost', 'https://')):
        response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Methods'] = 'GET'
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Accept-Ranges'] = 'bytes'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'

    return response


@main_bp.route('/privacy')
def privacy():
    return render_template('privacy.html')


@main_bp.route('/terms')
def terms():
    return render_template('terms.html')
