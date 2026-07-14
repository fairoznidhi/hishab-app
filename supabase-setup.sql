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

-- ============================================================
-- Multi-person support — run this block ONCE to upgrade an
-- existing database created with the setup above.
-- ============================================================

-- Table 3: stores each person (personnel selector)
create table if not exists people (
  id         bigserial primary key,
  name       text not null,
  color      text,
  created_at timestamptz default now()
);

alter table people enable row level security;
create policy "allow all people" on people for all using (true) with check (true);

-- Scope months to a person. Existing rows (if any) are left with a
-- null person_id — either delete them or manually assign a person_id
-- before making the column not null.
alter table months add column if not exists person_id bigint references people(id);

-- Replace the global-unique key with a per-person-unique key.
alter table months drop constraint if exists months_key_key;
alter table months add constraint months_person_key_unique unique (person_id, key);
