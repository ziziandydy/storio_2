import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env from .env file if exists, or assume env vars are set
load_dotenv(dotenv_path=".env")

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not URL or not KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    exit(1)

try:
    print(f"Connecting to {URL}...")
    supabase: Client = create_client(URL, KEY)
    print("Client created.")
    
    # Simple query
    response = supabase.table("collections").select("count", count="exact").limit(1).execute()
    print(f"Connection successful! Count: {response.count}")
    
except Exception as e:
    print(f"Connection failed: {e}")
