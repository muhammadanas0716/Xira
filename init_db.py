#!/usr/bin/env python3
"""
Initialize database schema
Usage: python init_db.py [url]
Example: python init_db.py http://localhost:5000
Example: python init_db.py https://your-app.vercel.app
"""

import sys
import requests

def init_database(url):
    endpoint = f"{url}/api/db/init"
    print(f"Initializing database at {endpoint}...")
    
    try:
        response = requests.post(endpoint, json={})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("\n✅ Database initialized successfully!")
            print("You can now try creating a chat again.")
        else:
            print("\n❌ Failed to initialize database")
            print(f"Error: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error connecting to {endpoint}")
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000"
    init_database(url)

