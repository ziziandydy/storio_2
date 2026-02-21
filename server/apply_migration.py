import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

# Parse the URL to get connection details
result = urlparse(DATABASE_URL)
username = result.username
password = result.password
database = result.path[1:]
hostname = result.hostname
port = result.port

print(f"Connecting to database {database} at {hostname}...")

try:
    conn = psycopg2.connect(
        database=database,
        user=username,
        password=password,
        host=hostname,
        port=port
    )
    conn.autocommit = True
    cursor = conn.cursor()

    sql = """
    -- Enable UUID extension
    create extension if not exists "uuid-ossp";

    -- Daily Recommendations Table
    create table if not exists daily_recommendations (
      id uuid primary key default uuid_generate_v4(),
      date date unique not null default current_date,
      books jsonb not null,
      created_at timestamptz default now()
    );

    -- Enable Row Level Security (RLS)
    alter table daily_recommendations enable row level security;

    -- Policy: Daily Recommendations (Public Read)
    -- Check if policy exists first to avoid error, or just drop and create
    drop policy if exists "Public can view daily recommendations" on daily_recommendations;
    create policy "Public can view daily recommendations" on daily_recommendations for select using (true);
    """

    cursor.execute(sql)
    print("Migration applied successfully!")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Migration failed: {e}")
