-- Applied remotely: thank_you_email_queue
create extension if not exists pgmq;

select pgmq.create('thank_you_emails');

create or replace function public.complete_payment_and_enqueue(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pgmq, pg_temp
as $$
declare
  paid public.payments%rowtype;
  newly_paid boolean := false;
  msg_id bigint;
begin
  update public.payments
  set status = 'paid'
  where id = p_payment_id and status = 'pending'
  returning * into paid;

  if found then
    newly_paid := true;
  else
    select * into paid
    from public.payments
    where id = p_payment_id;

    if not found then
      raise exception 'payment_not_found';
    end if;

    if paid.status <> 'paid' then
      raise exception 'payment_not_payable';
    end if;
  end if;

  insert into public.donations (
    id, payment_id, email, name, message, amount, items, lantern, created_at
  ) values (
    paid.id::text,
    paid.id,
    paid.email,
    paid.name,
    paid.message,
    paid.amount,
    paid.items,
    paid.lantern,
    coalesce(paid.created_at, now())
  )
  on conflict (payment_id) do update set
    email = excluded.email,
    name = excluded.name,
    message = excluded.message,
    amount = excluded.amount,
    items = excluded.items,
    lantern = excluded.lantern;

  if newly_paid and paid.thank_you_email_sent_at is null then
    select pgmq.send(
      'thank_you_emails',
      jsonb_build_object(
        'type', 'thank_you',
        'payment_id', paid.id,
        'email', paid.email,
        'name', paid.name,
        'message', paid.message,
        'amount', paid.amount,
        'order_code', paid.order_code,
        'items', paid.items
      )
    ) into msg_id;
  end if;

  return jsonb_build_object(
    'newly_paid', newly_paid,
    'queued_msg_id', msg_id,
    'payment', to_jsonb(paid)
  );
end;
$$;

revoke all on function public.complete_payment_and_enqueue(uuid) from public, anon, authenticated;
grant execute on function public.complete_payment_and_enqueue(uuid) to service_role, postgres;

create or replace function public.enqueue_thank_you_email_test(p_to text)
returns bigint
language plpgsql
security definer
set search_path = public, pgmq, pg_temp
as $$
declare
  msg_id bigint;
begin
  if p_to is null or p_to !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid_email';
  end if;

  select pgmq.send(
    'thank_you_emails',
    jsonb_build_object(
      'type', 'thank_you',
      'payment_id', null,
      'email', lower(p_to),
      'name', 'Bạn thử mail',
      'message', 'Đây là email thử qua Supabase Queue',
      'amount', 50000,
      'order_code', 999999,
      'items', jsonb_build_array(
        jsonb_build_object('productId', 'nuoc-sam', 'quantity', 1),
        jsonb_build_object('productId', 'com-chay', 'quantity', 1)
      ),
      'is_test', true
    )
  ) into msg_id;

  return msg_id;
end;
$$;

revoke all on function public.enqueue_thank_you_email_test(text) from public, anon, authenticated;
grant execute on function public.enqueue_thank_you_email_test(text) to service_role, postgres;

create or replace function public.read_thank_you_email_jobs(
  p_vt integer default 60,
  p_qty integer default 5
)
returns table (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
language sql
security definer
set search_path = public, pgmq, pg_temp
as $$
  select msg_id, read_ct, enqueued_at, vt, message
  from pgmq.read('thank_you_emails', p_vt, p_qty);
$$;

revoke all on function public.read_thank_you_email_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.read_thank_you_email_jobs(integer, integer) to service_role, postgres;

create or replace function public.archive_thank_you_email_job(p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = public, pgmq, pg_temp
as $$
  select pgmq.archive('thank_you_emails', p_msg_id);
$$;

revoke all on function public.archive_thank_you_email_job(bigint) from public, anon, authenticated;
grant execute on function public.archive_thank_you_email_job(bigint) to service_role, postgres;

create or replace function public.mark_thank_you_email_sent(p_payment_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.payments
  set thank_you_email_sent_at = coalesce(thank_you_email_sent_at, now())
  where id = p_payment_id and status = 'paid';
$$;

revoke all on function public.mark_thank_you_email_sent(uuid) from public, anon, authenticated;
grant execute on function public.mark_thank_you_email_sent(uuid) to service_role, postgres;
