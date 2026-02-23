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
    -- Create 'avatars' storage bucket if it doesn't exist
    -- Note: This requires the storage extension to be enabled in Supabase.
    -- Most Supabase projects have this by default.
    
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;

    -- Set up RLS for the avatars bucket
    -- Allow public access to read
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

    -- Allow authenticated users to upload their own avatars
    -- We'll name the files based on user_id to simplify management
    DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
    CREATE POLICY "Users can upload their own avatars" ON storage.objects 
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

    DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    CREATE POLICY "Users can update their own avatars" ON storage.objects 
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );
    """

    cursor.execute(sql)
    print("Storage bucket 'avatars' and policies created successfully!")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Migration failed: {e}")
    print("Note: You might need to manually create the 'avatars' bucket in the Supabase Dashboard and set it to Public.")
