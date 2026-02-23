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
    -- Create migrate_guest_data function
    CREATE OR REPLACE FUNCTION migrate_guest_data(old_user_id UUID, new_user_id UUID)
    RETURNS VOID AS $$
    BEGIN
        -- Update collections
        -- Using ON CONFLICT logic if we had unique constraints, 
        -- but here we just update the user_id for all matching records.
        -- If duplicates exist (same external_id), we might want to handle them.
        
        -- Strategy: Update user_id for all items belonging to old_user_id.
        -- If the new user already has the same item (external_id + media_type), 
        -- we delete the guest version to avoid duplicates.
        
        DELETE FROM collections 
        WHERE user_id = old_user_id 
        AND (external_id, media_type) IN (
            SELECT external_id, media_type 
            FROM collections 
            WHERE user_id = new_user_id
        );

        UPDATE collections 
        SET user_id = new_user_id 
        WHERE user_id = old_user_id;
        
        -- Note: If there are other tables like 'ratings' or 'reflections' 
        -- that are not part of the 'collections' table, update them here too.
        -- Currently, 'collections' seems to hold rating and notes.
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Grant access to the function
    GRANT EXECUTE ON FUNCTION migrate_guest_data(UUID, UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION migrate_guest_data(UUID, UUID) TO service_role;
    """

    cursor.execute(sql)
    print("Migration for Sprint 4 applied successfully!")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Migration failed: {e}")
