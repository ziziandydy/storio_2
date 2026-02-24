import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("server/.env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

res = supabase.table("collections").select("*").limit(5).execute()
print("Total items from select *:", len(res.data))
for item in res.data:
    print(item['title'], item['created_at'], item['user_id'])

# Simulate get_monthly_stats
start_iso = "2026-02-01T00:00:00Z"
end_iso = "2026-02-28T23:59:59.999999Z"

# Try an exact known user_id if any, else we just test the date filter
res2 = supabase.table("collections").select("*").gte("created_at", start_iso).lte("created_at", end_iso).execute()
print("Total items from gte/lte:", len(res2.data))

# Now try without .Z
start_no_z = "2026-02-01T00:00:00"
end_no_z = "2026-02-28T23:59:59"
res3 = supabase.table("collections").select("*").gte("created_at", start_no_z).lte("created_at", end_no_z).execute()
print("Total items without Z:", len(res3.data))
