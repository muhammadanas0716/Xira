# Project Structure

## Directory Layout

```
Xira 2.0/
├── app/                          # Main application package
│   ├── __init__.py              # Flask app factory
│   ├── routes/                  # Route handlers (URL endpoints)
│   │   ├── __init__.py
│   │   ├── main.py             # Main routes (homepage, PDF serving)
│   │   └── api.py               # API endpoints (REST API)
│   ├── services/                # Business logic services
│   │   ├── __init__.py
│   │   ├── sec_service.py      # SEC API integration
│   │   ├── stock_service.py    # Stock data via yfinance
│   │   ├── pdf_service.py      # PDF text extraction
│   │   └── llm_service.py      # OpenAI LLM integration
│   ├── models/                  # Data models
│   │   ├── __init__.py
│   │   └── chat.py             # Chat model and in-memory storage
│   └── utils/                   # Utility functions
│       ├── __init__.py
│       └── config.py           # Configuration management
│
├── templates/                    # HTML templates
│   └── index.html              # Main frontend template
│
├── static/                       # Static files (CSS, JS, images)
│
├── downloads/                    # Downloaded PDF files
│   └── *.pdf
│
├── config/                       # Configuration files
│
├── run.py                        # Application entry point
├── requirements.txt              # Python dependencies
├── README.md                     # Project documentation
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules

```

## Module Responsibilities

### `app/__init__.py`

- Creates and configures the Flask application
- Registers blueprints
- Application factory pattern

### `app/routes/main.py`

- Homepage route (`/`)
- PDF file serving (`/pdfs/<filename>`)

### `app/routes/api.py`

- `/api/create-chat` - Create new chat for ticker
- `/api/chats` - List all chats
- `/api/chats/<id>` - Get specific chat
- `/api/chats/<id>/ask` - Ask question about PDF
- `/api/download-pdf` - Download PDF for ticker
- `/api/pdfs` - List available PDFs

### `app/services/sec_service.py`

- Handles SEC API interactions
- Downloads 10-Q filings
- Gets filing URLs

### `app/services/stock_service.py`

- Fetches stock information using yfinance
- Returns stock fundamentals

### `app/services/pdf_service.py`

- Extracts text from PDF files
- Uses pdfplumber (with PyPDF2 fallback)

### `app/services/llm_service.py`

- Integrates with OpenAI API
- Answers questions based on PDF content

### `app/models/chat.py`

- Chat data model
- In-memory chat storage
- Message management

### `app/utils/config.py`

- Configuration management
- Environment variable loading
- App configuration

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the application
python run.py
```

## Migration Notes

- Old `app.py` has been renamed to `app.py.old`
- Old `main.py` (CLI script) has been renamed to `main.py.old`
- All functionality has been preserved and reorganized
- The application now follows Flask best practices with blueprints and service layer
