-- Applied remotely via Supabase MCP: create_admins

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admins_username_lower_idx on public.admins (lower(username));

alter table public.admins enable row level security;

revoke all on table public.admins from anon, authenticated;
grant all on table public.admins to service_role;
