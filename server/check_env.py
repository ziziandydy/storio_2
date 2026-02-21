import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

print("Keys present in environment:")
for key in os.environ:
    if "SUPABASE" in key or "KEY" in key:
        print(f"- {key}")
