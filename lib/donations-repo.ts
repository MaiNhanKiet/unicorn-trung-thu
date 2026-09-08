import "server-only";
import { sql } from "@/lib/db";
import type {
  CartLine,
  Donation,
  LanternKind,
  PaymentRecord,
  PaymentStatus,
} from "@/lib/types";

type PaymentRow = {
  id: string;
  order_code: number | string;
  amount: number;
  description: string;
  status: PaymentStatus;
  qr_payload: string;
  checkout_url: string | null;
  payos_link_id: string | null;
  bin: string | null;
  account_number: string | null;
  transfer_description: string | null;
  email: string;
  name: string;
  message: string;
  items: CartLine[] | string;
  lantern: LanternKind;
  created_at: string | Date;
};

type DonationRow = {
  id: string;
  payment_id: string;
  email: string;
  name: string;
  message: string;
  amount: number;
  items: CartLine[] | string;
  lantern: LanternKind;
  created_at: string | Date;
};

function parseItems(value: CartLine[] | string): CartLine[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toMs(value: string | Date) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    orderCode: Number(row.order_code),
    amount: row.amount,
    description: row.description,
    status: row.status,
    qrPayload: row.qr_payload,
    checkoutUrl: row.checkout_url,
    payosLinkId: row.payos_link_id,
    bin: row.bin,
    accountNumber: row.account_number,
    transferDescription: row.transfer_description,
    email: row.email,
    name: row.name,
    message: row.message,
    items: parseItems(row.items),
    lantern: row.lantern,
    createdAt: toMs(row.created_at),
  };
}

export function mapDonation(row: DonationRow): Donation {
  return {
    id: row.id,
    paymentId: row.payment_id,
    email: row.email,
    name: row.name,
    message: row.message,
    amount: row.amount,
    items: parseItems(row.items),
    lantern: row.lantern,
    createdAt: toMs(row.created_at),
  };
}

export async function insertPayment(payment: PaymentRecord) {
  await sql`
    insert into payments (
      id, order_code, amount, description, status, qr_payload,
      checkout_url, payos_link_id, bin, account_number, transfer_description,
      email, name, message, items, lantern, created_at
    ) values (
      ${payment.id}::uuid,
      ${payment.orderCode},
      ${payment.amount},
      ${payment.description},
      ${payment.status},
      ${payment.qrPayload},
      ${payment.checkoutUrl},
      ${payment.payosLinkId},
      ${payment.bin},
      ${payment.accountNumber},
      ${payment.transferDescription},
      ${payment.email},
      ${payment.name},
      ${payment.message},
      ${sql.json(payment.items)},
      ${payment.lantern},
      ${new Date(payment.createdAt)}
    )
  `;
}

export async function getPayment(id: string) {
  const rows = await sql<PaymentRow[]>`
    select * from payments where id = ${id}::uuid limit 1
  `;
  return rows[0] ? mapPayment(rows[0]) : null;
}

export async function getPaymentByOrderCode(orderCode: number) {
  const rows = await sql<PaymentRow[]>`
    select * from payments where order_code = ${orderCode} limit 1
  `;
  return rows[0] ? mapPayment(rows[0]) : null;
}

export async function markPaymentPaid(id: string) {
  const rows = await sql<PaymentRow[]>`
    update payments
    set status = 'paid'
    where id = ${id}::uuid and status = 'pending'
    returning *
  `;
  if (rows[0]) return mapPayment(rows[0]);

  const existing = await getPayment(id);
  if (!existing) return null;
  if (existing.status === "paid") return existing;
  throw new Error("Thanh toán không còn ở trạng thái chờ.");
}

export async function markPaymentCancelled(id: string) {
  const rows = await sql<PaymentRow[]>`
    update payments
    set status = 'cancelled'
    where id = ${id}::uuid and status = 'pending'
    returning *
  `;
  if (rows[0]) return mapPayment(rows[0]);
  return getPayment(id);
}

export async function upsertDonationFromPayment(payment: PaymentRecord) {
  const rows = await sql<DonationRow[]>`
    insert into donations (
      id, payment_id, email, name, message, amount, items, lantern, created_at
    ) values (
      ${payment.id},
      ${payment.id}::uuid,
      ${payment.email},
      ${payment.name},
      ${payment.message},
      ${payment.amount},
      ${sql.json(payment.items)},
      ${payment.lantern},
      now()
    )
    on conflict (payment_id) do update set
      email = excluded.email,
      name = excluded.name,
      message = excluded.message,
      amount = excluded.amount,
      items = excluded.items,
      lantern = excluded.lantern
    returning *
  `;
  return mapDonation(rows[0]!);
}

export async function completePaymentIfPending(payment: PaymentRecord) {
  if (payment.status === "paid") {
    await upsertDonationFromPayment(payment);
    return payment;
  }
  if (payment.status !== "pending") return payment;

  const paid = await markPaymentPaid(payment.id);
  if (!paid) return payment;
  await upsertDonationFromPayment(paid);
  return paid;
}

export async function listDonations() {
  const rows = await sql<DonationRow[]>`
    select * from donations order by created_at desc
  `;
  return rows.map(mapDonation);
}

export async function findDonationsByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const rows = await sql<DonationRow[]>`
    select * from donations
    where lower(email) = ${normalized}
    order by created_at desc
  `;
  return rows.map(mapDonation);
}
