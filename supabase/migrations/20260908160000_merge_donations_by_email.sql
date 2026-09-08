-- Merge donations by email: one lantern per person, payments keep full history.
-- Applied remotely via Supabase MCP: merge_donations_by_email

create or replace function public.merge_cart_items(a jsonb, b jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'productId', product_id,
          'quantity', quantity
        )
        order by product_id
      )
      from (
        select
          elem->>'productId' as product_id,
          sum(coalesce((elem->>'quantity')::int, 0))::int as quantity
        from (
          select jsonb_array_elements(coalesce(a, '[]'::jsonb)) as elem
          union all
          select jsonb_array_elements(coalesce(b, '[]'::jsonb)) as elem
        ) raw
        where coalesce(elem->>'productId', '') <> ''
        group by elem->>'productId'
      ) rolled
    ),
    '[]'::jsonb
  );
$$;

alter table public.donations
  add column if not exists updated_at timestamptz not null default now();

with base as (
  select
    lower(email) as email_key,
    (array_agg(id order by created_at asc, id asc))[1] as keep_id,
    (array_agg(payment_id order by created_at desc, id desc))[1] as latest_payment_id,
    (array_agg(name order by created_at desc, id desc))[1] as latest_name,
    (array_agg(message order by created_at desc, id desc))[1] as latest_message,
    (array_agg(lantern order by created_at asc, id asc))[1] as keep_lantern,
    sum(amount)::int as total_amount
  from public.donations
  group by lower(email)
),
merged as (
  select
    b.*,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('productId', product_id, 'quantity', quantity)
          order by product_id
        ),
        '[]'::jsonb
      )
      from (
        select
          elem->>'productId' as product_id,
          sum(coalesce((elem->>'quantity')::int, 0))::int as quantity
        from public.donations d2,
        lateral jsonb_array_elements(coalesce(d2.items, '[]'::jsonb)) as elem
        where lower(d2.email) = b.email_key
          and coalesce(elem->>'productId', '') <> ''
        group by elem->>'productId'
      ) items_roll
    ) as merged_items
  from base b
)
update public.donations d
set
  payment_id = m.latest_payment_id,
  name = m.latest_name,
  message = m.latest_message,
  amount = m.total_amount,
  items = m.merged_items,
  lantern = m.keep_lantern,
  updated_at = now()
from merged m
where d.id = m.keep_id;

delete from public.donations d
where d.id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by lower(email)
        order by created_at asc, id asc
      ) as rn
    from public.donations
  ) ranked
  where ranked.rn > 1
);

alter table public.donations drop constraint if exists donations_payment_id_key;

create unique index if not exists donations_email_lower_uidx
  on public.donations (lower(email));

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
  existing public.donations%rowtype;
  donation_id text;
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

  select * into existing
  from public.donations
  where lower(email) = lower(paid.email)
  limit 1
  for update;

  if found then
    donation_id := existing.id;

    if newly_paid then
      update public.donations
      set
        payment_id = paid.id,
        email = paid.email,
        name = paid.name,
        message = case
          when nullif(trim(paid.message), '') is null then existing.message
          else paid.message
        end,
        amount = existing.amount + paid.amount,
        items = public.merge_cart_items(existing.items, paid.items),
        updated_at = now()
      where id = existing.id;
    else
      update public.donations
      set
        payment_id = paid.id,
        updated_at = now()
      where id = existing.id
        and payment_id is distinct from paid.id;
    end if;
  else
    donation_id := paid.id::text;
    begin
      insert into public.donations (
        id, payment_id, email, name, message, amount, items, lantern, created_at, updated_at
      ) values (
        donation_id,
        paid.id,
        paid.email,
        paid.name,
        paid.message,
        paid.amount,
        paid.items,
        paid.lantern,
        coalesce(paid.created_at, now()),
        now()
      );
    exception
      when unique_violation then
        select * into existing
        from public.donations
        where lower(email) = lower(paid.email)
        limit 1
        for update;

        donation_id := existing.id;

        if newly_paid then
          update public.donations
          set
            payment_id = paid.id,
            email = paid.email,
            name = paid.name,
            message = case
              when nullif(trim(paid.message), '') is null then existing.message
              else paid.message
            end,
            amount = existing.amount + paid.amount,
            items = public.merge_cart_items(existing.items, paid.items),
            updated_at = now()
          where id = existing.id;
        end if;
    end;
  end if;

  if newly_paid then
    select pgmq.send(
      'thank_you_emails',
      jsonb_build_object(
        'type', 'thank_you',
        'payment_id', paid.id,
        'donation_id', donation_id,
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
    'donation_id', donation_id,
    'payment', to_jsonb(paid)
  );
end;
$$;

revoke all on function public.complete_payment_and_enqueue(uuid) from public, anon, authenticated;
grant execute on function public.complete_payment_and_enqueue(uuid) to service_role, postgres;
grant execute on function public.merge_cart_items(jsonb, jsonb) to service_role, postgres;
