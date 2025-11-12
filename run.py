from app import create_app
from app.utils.config import Config

app = create_app()
Config.init_app(app)

if __name__ == '__main__':
    import os
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)

