import "server-only";
import { sql } from "@/lib/db";
import { LANTERN_KINDS, PRODUCTS } from "@/lib/catalog";
import type { PaymentStatusFilter } from "@/lib/admin-types";
import type { CartLine, LanternKind, PaymentStatus, ProductId } from "@/lib/types";
import { normalizeEmail } from "@/lib/format";
import { getPayment } from "@/lib/donations-repo";

export type { PaymentStatusFilter };

export type AdminPaymentRow = {
  id: string;
  orderCode: number;
  amount: number;
  description: string;
  status: PaymentStatus;
  email: string;
  name: string;
  message: string;
  items: CartLine[];
  lantern: string;
  createdAt: number;
  thankYouEmailSentAt: number | null;
  checkoutUrl: string | null;
};

const PRODUCT_IDS = new Set(PRODUCTS.map((product) => product.id));

function parseItems(value: CartLine[] | string): CartLine[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toMs(value: string | Date | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function normalizeItems(items: CartLine[]): CartLine[] {
  const quantities = new Map<ProductId, number>();
  for (const line of items) {
    if (!PRODUCT_IDS.has(line.productId as ProductId)) continue;
    const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));
    if (quantity <= 0) continue;
    const id = line.productId as ProductId;
    quantities.set(id, (quantities.get(id) ?? 0) + quantity);
  }
  return PRODUCTS.map((product) => ({
    productId: product.id,
    quantity: quantities.get(product.id) ?? 0,
  })).filter((line) => line.quantity > 0);
}

type PaymentDbRow = {
  id: string;
  order_code: number | string;
  amount: number;
  description: string;
  status: PaymentStatus;
  email: string;
  name: string;
  message: string;
  items: CartLine[] | string;
  lantern: string;
  created_at: string | Date;
  thank_you_email_sent_at: string | Date | null;
  checkout_url: string | null;
};

function mapAdminPayment(row: PaymentDbRow): AdminPaymentRow {
  return {
    id: row.id,
    orderCode: Number(row.order_code),
    amount: row.amount,
    description: row.description,
    status: row.status,
    email: row.email,
    name: row.name,
    message: row.message,
    items: parseItems(row.items),
    lantern: row.lantern,
    createdAt: toMs(row.created_at) ?? 0,
    thankYouEmailSentAt: toMs(row.thank_you_email_sent_at),
    checkoutUrl: row.checkout_url,
  };
}

export async function queryAdminPayments(input: {
  page: number;
  pageSize: number;
  search: string;
  status: PaymentStatusFilter;
}) {
  const page = Math.max(1, input.page);
  const pageSize = [10, 20, 50, 100].includes(input.pageSize)
    ? input.pageSize
    : 20;
  const offset = (page - 1) * pageSize;
  const search = input.search.trim();
  const like = `%${search}%`;
  const status = input.status;

  const countRows = await sql<{ total: number }[]>`
    select count(*)::int as total
    from payments p
    where (
      ${search} = ''
      or p.name ilike ${like}
      or p.email ilike ${like}
      or p.message ilike ${like}
      or p.id::text ilike ${like}
      or p.order_code::text ilike ${like}
    )
    and (
      ${status} = 'all'
      or p.status = ${status}
    )
  `;

  const rows = await sql<PaymentDbRow[]>`
    select
      p.id,
      p.order_code,
      p.amount,
      p.description,
      p.status,
      p.email,
      p.name,
      p.message,
      p.items,
      p.lantern,
      p.created_at,
      p.thank_you_email_sent_at,
      p.checkout_url
    from payments p
    where (
      ${search} = ''
      or p.name ilike ${like}
      or p.email ilike ${like}
      or p.message ilike ${like}
      or p.id::text ilike ${like}
      or p.order_code::text ilike ${like}
    )
    and (
      ${status} = 'all'
      or p.status = ${status}
    )
    order by p.created_at desc
    limit ${pageSize}
    offset ${offset}
  `;

  const total = countRows[0]?.total ?? 0;
  return {
    payments: rows.map(mapAdminPayment),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type AdminPaymentUpdate = {
  name: string;
  email: string;
  message: string;
  amount: number;
  description: string;
  lantern: LanternKind;
  items: CartLine[];
};

export async function updateAdminPayment(
  paymentId: string,
  input: AdminPaymentUpdate,
) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const message = input.message.trim();
  const description = input.description.trim() || "donate";
  const amount = Math.round(Number(input.amount));
  const lantern = input.lantern;
  const items = normalizeItems(input.items);

  if (!name) return { ok: false as const, error: "Thiếu tên người gửi." };
  if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Email không hợp lệ." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Số tiền phải lớn hơn 0." };
  }
  if (!LANTERN_KINDS.includes(lantern)) {
    return { ok: false as const, error: "Loại lồng đèn không hợp lệ." };
  }

  const rows = await sql<PaymentDbRow[]>`
    update payments
    set
      name = ${name},
      email = ${email},
      message = ${message},
      amount = ${amount},
      description = ${description},
      lantern = ${lantern},
      items = ${sql.json(items)}
    where id = ${paymentId}::uuid
    returning
      id, order_code, amount, description, status, email, name, message,
      items, lantern, created_at, thank_you_email_sent_at, checkout_url
  `;

  const row = rows[0];
  if (!row) {
    return { ok: false as const, error: "Không tìm thấy payment." };
  }

  return { ok: true as const, payment: mapAdminPayment(row) };
}

export async function cancelAdminPayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (!payment) {
    return { ok: false as const, error: "Không tìm thấy payment." };
  }
  if (payment.status === "paid") {
    return {
      ok: false as const,
      error: "Không hủy được payment đã thanh toán.",
    };
  }

  const rows = await sql<PaymentDbRow[]>`
    update payments
    set status = 'cancelled'
    where id = ${paymentId}::uuid
      and status in ('pending', 'cancelled')
    returning
      id, order_code, amount, description, status, email, name, message,
      items, lantern, created_at, thank_you_email_sent_at, checkout_url
  `;

  const row = rows[0];
  if (!row) {
    return { ok: false as const, error: "Không hủy được payment." };
  }

  if (payment.status === "pending") {
    try {
      const { publishPaymentStatus } = await import("@/lib/payment-events");
      publishPaymentStatus(row.id, "cancelled");
    } catch {
      /* optional */
    }
  }

  return { ok: true as const, payment: mapAdminPayment(row) };
}

export async function markAdminPaymentPaid(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (!payment) {
    return { ok: false as const, error: "Không tìm thấy payment." };
  }
  if (payment.status === "cancelled") {
    return { ok: false as const, error: "Payment đã hủy, không đánh dấu paid." };
  }

  const { completePaymentIfPending } = await import("@/lib/donations-repo");
  await completePaymentIfPending(payment);

  const rows = await sql<PaymentDbRow[]>`
    select
      id, order_code, amount, description, status, email, name, message,
      items, lantern, created_at, thank_you_email_sent_at, checkout_url
    from payments
    where id = ${paymentId}::uuid
    limit 1
  `;
  const row = rows[0];
  if (!row) {
    return { ok: false as const, error: "Không đọc lại được payment." };
  }
  return { ok: true as const, payment: mapAdminPayment(row) };
}

export async function clearThankYouEmailFlag(paymentId: string) {
  const rows = await sql<PaymentDbRow[]>`
    update payments
    set thank_you_email_sent_at = null
    where id = ${paymentId}::uuid
      and status = 'paid'
    returning
      id, order_code, amount, description, status, email, name, message,
      items, lantern, created_at, thank_you_email_sent_at, checkout_url
  `;
  const row = rows[0];
  if (!row) {
    return {
      ok: false as const,
      error: "Chỉ xóa cờ mail trên payment đã paid.",
    };
  }
  return { ok: true as const, payment: mapAdminPayment(row) };
}
