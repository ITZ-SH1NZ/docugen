-- Document automation platform — schema, RLS, and storage buckets.
-- Run in the Supabase SQL editor (or `supabase db push`).

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(255) not null,
  description text,
  pdf_storage_path text,          -- path inside the private "templates" bucket
  page_width float,               -- intrinsic PDF page size (points), for the editor
  page_height float,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  version int default 1,
  unique (user_id, name)
);

create table if not exists public.template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  field_index int not null,
  label varchar(255) not null,
  field_type varchar(50) default 'text',
  x float not null,
  y float not null,
  width float not null,
  height float not null,
  max_font_size int default 24,
  min_font_size int default 8,
  font_family varchar(64) default 'Arial',
  font_weight varchar(32) default 'normal',
  alignment varchar(32) default 'left',
  color jsonb default '[0,0,0]'::jsonb,
  transform varchar(32) default 'none',   -- none | uppercase | lowercase | title_case
  wrap_text boolean default true,
  created_at timestamptz default now(),
  unique (template_id, field_index)
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.templates(id),
  name varchar(255),
  status varchar(32) default 'queued',   -- queued | processing | completed | failed
  progress int default 0,
  total_rows int,
  generated_count int default 0,
  flagged_count int default 0,
  csv_storage_path text,
  metadata_storage_path text,
  output_zip_path text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  generation_time_ms int,
  avg_time_per_pdf_ms int,
  output_size_mb float
);

create table if not exists public.flagged_pdfs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  row_index int not null,
  flags jsonb,
  csv_data jsonb,
  pdf_storage_path text,
  edited boolean default false,
  edited_by_user boolean default false,
  created_at timestamptz default now(),
  unique (batch_id, row_index)
);

create table if not exists public.batch_pdfs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  row_index int not null,
  pdf_storage_path text,
  csv_data jsonb,
  has_flags boolean default false,
  created_at timestamptz default now(),
  unique (batch_id, row_index)
);

create index if not exists idx_templates_user on public.templates(user_id);
create index if not exists idx_fields_template on public.template_fields(template_id);
create index if not exists idx_batches_user on public.batches(user_id);
create index if not exists idx_batches_status on public.batches(status);
create index if not exists idx_flagged_batch on public.flagged_pdfs(batch_id);
create index if not exists idx_batch_pdfs_batch on public.batch_pdfs(batch_id);

-- ─────────────────────────────────────────────────────────────
-- Row-level security: every user sees only their own rows.
-- Child tables are gated through their parent's user_id.
-- ─────────────────────────────────────────────────────────────

alter table public.templates       enable row level security;
alter table public.template_fields enable row level security;
alter table public.batches         enable row level security;
alter table public.flagged_pdfs    enable row level security;
alter table public.batch_pdfs      enable row level security;

create policy templates_owner on public.templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy batches_owner on public.batches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy fields_owner on public.template_fields
  for all using (
    exists (select 1 from public.templates t
            where t.id = template_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.templates t
            where t.id = template_id and t.user_id = auth.uid())
  );

create policy flagged_owner on public.flagged_pdfs
  for all using (
    exists (select 1 from public.batches b
            where b.id = batch_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.batches b
            where b.id = batch_id and b.user_id = auth.uid())
  );

create policy batch_pdfs_owner on public.batch_pdfs
  for all using (
    exists (select 1 from public.batches b
            where b.id = batch_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.batches b
            where b.id = batch_id and b.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- Private storage buckets. The worker uses the service-role key
-- (bypasses RLS); browser access is always via signed URLs minted
-- server-side, so no storage policies are required for clients.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('templates', 'templates', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('batches', 'batches', false)
on conflict (id) do nothing;
