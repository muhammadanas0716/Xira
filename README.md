# Fira - Financial Research Assistant

A Flask-based web application for analyzing stock tickers, downloading SEC 10-Q reports, and asking questions about them using AI.

## Project Structure

```
Fira 2.0/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── routes/              # Route handlers
│   │   ├── main.py         # Main routes (home, PDF serving)
│   │   └── api.py          # API endpoints
│   ├── services/           # Business logic services
│   │   ├── sec_service.py  # SEC API integration
│   │   ├── stock_service.py # Stock data (yfinance)
│   │   ├── pdf_service.py  # PDF text extraction
│   │   └── llm_service.py  # OpenAI LLM integration
│   ├── models/             # Data models
│   │   └── chat.py        # Chat model and storage
│   └── utils/              # Utilities
│       └── config.py      # Configuration
├── templates/              # HTML templates
│   └── index.html
├── static/                 # Static files (CSS, JS, images)
├── downloads/              # Downloaded PDFs
├── config/                 # Configuration files
├── run.py                  # Application entry point
├── requirements.txt        # Python dependencies
└── .env.example           # Environment variables template
```

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```
   SEC_API_KEY=your_sec_api_key
   OPENAI_API_KEY=your_openai_api_key
   SECRET_KEY=your_secret_key
   DOWNLOADS_DIR=downloads
   ```

3. **Run the application:**
   ```bash
   python run.py
   ```

4. **Access the application:**
   Open your browser and go to `http://localhost:5000`

## Features

- **Stock Information**: Fetch real-time stock data using yfinance
- **SEC Filings**: Download latest 10-Q quarterly reports
- **PDF Analysis**: Extract text from PDFs and ask questions using AI
- **Chat System**: Create chats for each ticker with conversation history

## API Endpoints

- `GET /` - Main page
- `GET /pdfs/<filename>` - Serve PDF files
- `POST /api/create-chat` - Create a new chat for a ticker
- `GET /api/chats` - List all chats
- `GET /api/chats/<chat_id>` - Get specific chat
- `POST /api/chats/<chat_id>/ask` - Ask a question about the PDF
- `POST /api/download-pdf` - Download PDF for a ticker

## Technologies

- Flask - Web framework
- yfinance - Stock data
- sec-api - SEC filings
- OpenAI GPT-3.5 - LLM for Q&A
- pdfplumber - PDF text extraction
- Tailwind CSS - Styling

