import "server-only";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { PRODUCT_MAP, PRODUCTS } from "@/lib/catalog";
import { kickThankYouEmailWorker } from "@/lib/mail-worker";
import { sendThankYouEmail } from "@/lib/mail";
import { getPayment } from "@/lib/donations-repo";
import type {
  AdminDonationRow,
  AdminSortKey,
  MailFilter,
  ProductSoldStat,
} from "@/lib/admin-types";
import type { CartLine, ProductId } from "@/lib/types";

export type { AdminDonationRow, AdminSortKey, MailFilter, ProductSoldStat };

const SORT_COLUMNS: Record<AdminSortKey, string> = {
  createdAt: "d.created_at",
  amount: "d.amount",
  name: "d.name",
  email: "d.email",
  mailSent: "p.thank_you_email_sent_at",
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

function toMs(value: string | Date | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session) {
    return null;
  }
  return session;
}

export async function queryAdminDonations(input: {
  page: number;
  pageSize: number;
  search: string;
  mailFilter: MailFilter;
  sort: AdminSortKey;
  sortDir: "asc" | "desc";
}) {
  const page = Math.max(1, input.page);
  const pageSize = [10, 20, 50, 100].includes(input.pageSize)
    ? input.pageSize
    : 20;
  const offset = (page - 1) * pageSize;
  const search = input.search.trim();
  const like = `%${search}%`;
  const mailFilter = input.mailFilter;
  const sortCol = SORT_COLUMNS[input.sort] ?? SORT_COLUMNS.createdAt;
  const sortDir = input.sortDir === "asc" ? "asc" : "desc";

  const countRows = await sql<{ total: number }[]>`
    select count(*)::int as total
    from donations d
    join payments p on p.id = d.payment_id
    where (
      ${search} = ''
      or d.name ilike ${like}
      or d.email ilike ${like}
      or d.message ilike ${like}
      or d.id ilike ${like}
    )
    and (
      ${mailFilter} = 'all'
      or (${mailFilter} = 'sent' and p.thank_you_email_sent_at is not null)
      or (${mailFilter} = 'pending' and p.thank_you_email_sent_at is null)
    )
  `;

  const rows = await sql<
    {
      id: string;
      payment_id: string;
      email: string;
      name: string;
      message: string;
      amount: number;
      items: CartLine[] | string;
      lantern: string;
      created_at: string | Date;
      thank_you_email_sent_at: string | Date | null;
    }[]
  >`
    select
      d.id,
      d.payment_id,
      d.email,
      d.name,
      d.message,
      d.amount,
      d.items,
      d.lantern,
      d.created_at,
      p.thank_you_email_sent_at
    from donations d
    join payments p on p.id = d.payment_id
    where (
      ${search} = ''
      or d.name ilike ${like}
      or d.email ilike ${like}
      or d.message ilike ${like}
      or d.id ilike ${like}
    )
    and (
      ${mailFilter} = 'all'
      or (${mailFilter} = 'sent' and p.thank_you_email_sent_at is not null)
      or (${mailFilter} = 'pending' and p.thank_you_email_sent_at is null)
    )
    order by ${sql.unsafe(sortCol)} ${sql.unsafe(sortDir)} nulls last
    limit ${pageSize}
    offset ${offset}
  `;

  const total = countRows[0]?.total ?? 0;
  const donations: AdminDonationRow[] = rows.map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    email: row.email,
    name: row.name,
    message: row.message,
    amount: row.amount,
    items: parseItems(row.items),
    lantern: row.lantern,
    createdAt: toMs(row.created_at) ?? 0,
    thankYouEmailSentAt: toMs(row.thank_you_email_sent_at),
  }));

  return {
    donations,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminOverviewStats() {
  const summary = await sql<
    { total_amount: number | null; total_count: number }[]
  >`
    select
      coalesce(sum(amount), 0)::int as total_amount,
      count(*)::int as total_count
    from donations
  `;

  const productRows = await sql<{ product_id: string; qty: number }[]>`
    select
      item->>'productId' as product_id,
      coalesce(sum((item->>'quantity')::int), 0)::int as qty
    from donations d,
    lateral jsonb_array_elements(
      case
        when jsonb_typeof(d.items) = 'array' then d.items
        else '[]'::jsonb
      end
    ) as item
    group by item->>'productId'
  `;

  const soldByProduct: ProductSoldStat[] = PRODUCTS.map((product) => {
    const row = productRows.find((entry) => entry.product_id === product.id);
    return {
      productId: product.id,
      name: product.name,
      quantity: row?.qty ?? 0,
    };
  });

  for (const row of productRows) {
    if (!PRODUCT_MAP[row.product_id as ProductId]) {
      soldByProduct.push({
        productId: row.product_id as ProductId,
        name: row.product_id,
        quantity: row.qty,
      });
    }
  }

  return {
    totalAmount: summary[0]?.total_amount ?? 0,
    totalCount: summary[0]?.total_count ?? 0,
    soldByProduct,
  };
}

/** Gửi lại mail cảm ơn ngay (SMTP), rồi đánh dấu đã gửi. */
export async function resendThankYouMail(donationId: string) {
  const rows = await sql<{ payment_id: string }[]>`
    select payment_id from donations where id = ${donationId} limit 1
  `;
  const paymentId = rows[0]?.payment_id;
  if (!paymentId) {
    return { ok: false as const, error: "Không tìm thấy lượt quyên góp." };
  }

  const payment = await getPayment(paymentId);
  if (!payment || payment.status !== "paid") {
    return { ok: false as const, error: "Thanh toán chưa hợp lệ." };
  }

  const result = await sendThankYouEmail(payment);
  if (!result.sent) {
    return {
      ok: false as const,
      error:
        result.reason === "missing_mail"
          ? "Chưa cấu hình SMTP."
          : "Gửi mail thất bại.",
    };
  }

  await sql`
    select public.mark_thank_you_email_sent(${paymentId}::uuid)
  `;

  // Đồng bộ queue worker nếu còn job treo
  kickThankYouEmailWorker();

  return { ok: true as const, thankYouEmailSentAt: Date.now() };
}
