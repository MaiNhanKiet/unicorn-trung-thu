-- Applied remotely: add_vietqr_account_fields

alter table public.payments
  add column if not exists bin text,
  add column if not exists account_number text,
  add column if not exists transfer_description text;
