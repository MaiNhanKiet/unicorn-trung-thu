-- Applied remotely via Supabase MCP: create_payments_and_donations

create table public.payments (
  id uuid primary key,
  order_code bigint not null,
  amount integer not null check (amount > 0),
  description text not null,
  status text not null check (status in ('pending', 'paid', 'cancelled')),
  qr_payload text not null,
  email text not null,
  name text not null,
  message text not null default '',
  items jsonb not null default '[]'::jsonb,
  lantern text not null check (lantern in ('round', 'carp', 'pagoda', 'rabbit')),
  created_at timestamptz not null default now()
);

create index payments_status_idx on public.payments (status);
create index payments_email_idx on public.payments (email);

create table public.donations (
  id text primary key,
  payment_id uuid not null unique references public.payments (id) on delete restrict,
  email text not null,
  name text not null,
  message text not null default '',
  amount integer not null check (amount > 0),
  items jsonb not null default '[]'::jsonb,
  lantern text not null check (lantern in ('round', 'carp', 'pagoda', 'rabbit')),
  created_at timestamptz not null default now()
);

create index donations_created_at_idx on public.donations (created_at desc);
create index donations_email_idx on public.donations (lower(email));

alter table public.payments enable row level security;
alter table public.donations enable row level security;

revoke all on table public.payments from anon, authenticated;
revoke all on table public.donations from anon, authenticated;
grant all on table public.payments to service_role;
grant all on table public.donations to service_role;
