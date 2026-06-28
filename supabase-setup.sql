-- Run this ONCE in Supabase → SQL Editor → New Query → Run

-- Table 1: stores each month's data
create table if not exists months (
  id           bigserial primary key,
  key          text unique not null,   -- e.g. "2026_জুন"
  month        text not null,
  year         text not null,
  opening      numeric default 0,
  rental       numeric default 0,
  other_income numeric default 0,
  expenses     jsonb default '[]',     -- stores the expense list as JSON
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Table 2: stores remembered expense names (for autocomplete)
create table if not exists suggestions (
  name text primary key
);

-- Allow public read/write (no login needed for this app)
alter table months enable row level security;
alter table suggestions enable row level security;

create policy "allow all months" on months for all using (true) with check (true);
create policy "allow all suggestions" on suggestions for all using (true) with check (true);
