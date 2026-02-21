import sys
import os

# Add the server directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "server"))

from app.main import app

# Vercel needs the 'app' object to be available at the top level
# This bridges Vercel's API request to our FastAPI application.
