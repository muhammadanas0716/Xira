# Xira - Financial Research Assistant

<div align="center">
  <img src="static/images/logo.png" alt="Xira Logo" width="120" height="120">
</div>

A Flask-based web application for analyzing stock tickers, downloading SEC 10-Q reports, and asking questions about them using AI.

## Project Structure

```
Xira 2.0/
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

## Deployment

### Using Docker

1. **Build the Docker image:**
   ```bash
   docker build -t xira-app .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     -p 5000:5000 \
     -e SECRET_KEY=your-secret-key \
     -e SEC_API_KEY=your-sec-api-key \
     -e OPENAI_API_KEY=your-openai-api-key \
     -e POLYGON_API_KEY=your-polygon-api-key \
     -v $(pwd)/downloads:/app/downloads \
     --name xira-app \
     xira-app
   ```

### Using Docker Compose

1. **Create a `.env` file** with your environment variables:
   ```
   SECRET_KEY=your-secret-key-here-change-in-production
   SEC_API_KEY=your-sec-api-key
   OPENAI_API_KEY=your-openai-api-key
   POLYGON_API_KEY=your-polygon-api-key
   DOWNLOADS_DIR=downloads
   ```

2. **Start the application:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Production Deployment

For production, use Gunicorn directly:

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   ```bash
   export SECRET_KEY=your-secret-key
   export SEC_API_KEY=your-sec-api-key
   export OPENAI_API_KEY=your-openai-api-key
   export POLYGON_API_KEY=your-polygon-api-key
   export PORT=5000
   ```

3. **Run with Gunicorn:**
   ```bash
   gunicorn -c gunicorn.conf.py run:app
   ```

### Environment Variables

- `SECRET_KEY` - Flask secret key (required)
- `SEC_API_KEY` - SEC API key (required)
- `OPENAI_API_KEY` - OpenAI API key (required)
- `POLYGON_API_KEY` - Polygon API key (required)
- `DOWNLOADS_DIR` - Directory for downloaded PDFs (default: `downloads`)
- `PORT` - Port to run the application on (default: `5000`)
- `FLASK_DEBUG` - Enable debug mode (default: `False`)
- `WORKERS` - Number of Gunicorn workers (default: auto-calculated)
- `LOG_LEVEL` - Logging level (default: `info`)

