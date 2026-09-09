-- Soft-hide donations from public lantern street while keeping payment history.
alter table public.donations
  add column if not exists hidden_at timestamptz;

create index if not exists donations_hidden_at_idx
  on public.donations (hidden_at)
  where hidden_at is null;

comment on column public.donations.hidden_at is
  'When set, donation is hidden from the public lantern street but kept in admin/history.';
