-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Collections Table
create table if not exists collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  media_type text check (media_type in ('movie', 'book')) not null,
  subtype text,
  year integer,
  external_id text not null,
  poster_path text,
  source text not null,
  rating integer default 0,
  notes text,
  created_at timestamptz default now()
);

-- Trending Cache Table (Unified for Movies, Series, Books)
create table if not exists trending_cache (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date,
  type text not null check (type in ('movie', 'series', 'book')),
  data jsonb not null,
  created_at timestamptz default now(),
  unique (date, type)
);

-- Enable Row Level Security (RLS)
alter table collections enable row level security;
alter table trending_cache enable row level security;

-- Policy: Collections
drop policy if exists "Users can view their own collections" on collections;
create policy "Users can view their own collections" on collections for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own collections" on collections;
create policy "Users can insert their own collections" on collections for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own collections" on collections;
create policy "Users can delete their own collections" on collections for delete using (auth.uid() = user_id);

drop policy if exists "Users can update their own collections" on collections;
create policy "Users can update their own collections" on collections for update using (auth.uid() = user_id);

-- Policy: Trending Cache
drop policy if exists "Public can view trending cache" on trending_cache;
create policy "Public can view trending cache" on trending_cache for select using (true);