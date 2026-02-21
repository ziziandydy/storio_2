import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

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
    -- Add missing columns to collections table
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'subtype') THEN
            ALTER TABLE collections ADD COLUMN subtype text;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'year') THEN
            ALTER TABLE collections ADD COLUMN year integer;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'rating') THEN
            ALTER TABLE collections ADD COLUMN rating integer DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'notes') THEN
            ALTER TABLE collections ADD COLUMN notes text;
        END IF;
    END
    $$;
    """

    cursor.execute(sql)
    print("Schema update applied successfully!")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Migration failed: {e}")