# Supabase Setup Guide for Storio 2

## 1. Create Supabase Project
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Note down your `Project URL` and `API Keys` (Anon Public & Service Role).

## 2. Database Setup
1. Go to the **SQL Editor** in your Supabase Dashboard.
2. Open the file `server/db_schema.sql` in this project.
3. Copy the content and paste it into the SQL Editor.
4. Run the query to create the `bricks` table and RLS policies.

## 3. Auth Configuration
1. Go to **Authentication > Providers**.
2. Enable **Anonymous Sign-ins**.

## 4. Environment Variables

### Backend (`server/.env`)
Add the following keys:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-service-role-key-here
```
*(Note: Use the Service Role Key for the backend to ensure full administrative access if needed, though the code currently respects RLS via User ID validation)*

### Frontend (`client/.env.local`)
Create or update `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

## 5. Restart Servers
Restart both Frontend and Backend servers to load the new configurations.
```bash
# Terminal 1 (Backend)
cd server && uvicorn app.main:app --reload --port 8010

# Terminal 2 (Frontend)
cd client && npm run dev
```
