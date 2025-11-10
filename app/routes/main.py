from flask import Blueprint, render_template, send_from_directory, Response, make_response
import os
from app.utils.config import Config

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    pdfs = []
    if os.path.exists(Config.DOWNLOADS_DIR):
        pdfs = [f for f in os.listdir(Config.DOWNLOADS_DIR) if f.endswith('.pdf')]
    return render_template('index.html', pdfs=pdfs)

@main_bp.route('/pdfs/<filename>')
def serve_pdf(filename):
    filepath = os.path.join(Config.DOWNLOADS_DIR, filename)
    
    if not os.path.exists(filepath):
        return Response('PDF not found', status=404, mimetype='text/plain')
    
    response = make_response(send_from_directory(
        Config.DOWNLOADS_DIR, 
        filename,
        mimetype='application/pdf',
        as_attachment=False
    ))
    
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET'
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Accept-Ranges'] = 'bytes'
    
    return response

