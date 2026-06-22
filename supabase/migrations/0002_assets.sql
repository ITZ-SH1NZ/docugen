-- Migration 0002: Assets table and storage bucket
-- Run in the Supabase SQL editor.

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(255) not null,
  type varchar(50) not null, -- 'image' | 'font'
  storage_path text not null,
  size_bytes bigint not null,
  created_at timestamptz default now()
);

alter table public.assets enable row level security;

create policy assets_owner on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('assets', 'assets', false, 104857600) -- 100MB
on conflict (id) do update set file_size_limit = 104857600;
