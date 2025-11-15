#!/bin/bash

# Initialize database schema
# Usage: ./init_db.sh [url]
# Example: ./init_db.sh http://localhost:5000
# Example: ./init_db.sh https://your-app.vercel.app

URL=${1:-http://localhost:5000}

echo "Initializing database at $URL..."
curl -X POST "$URL/api/db/init" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Done! You can now try creating a chat again."

