-- Applied remotely: add_payos_payment_fields

alter table public.payments
  add column if not exists checkout_url text,
  add column if not exists payos_link_id text;

create unique index if not exists payments_order_code_uidx on public.payments (order_code);
create index if not exists payments_payos_link_id_idx on public.payments (payos_link_id);
