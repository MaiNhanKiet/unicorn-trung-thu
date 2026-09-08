import "server-only";
import { sql } from "@/lib/db";
import { sendThankYouEmail } from "@/lib/mail";
import type { CartLine, PaymentRecord } from "@/lib/types";

type QueueJob = {
  msg_id: number;
  message: {
    type?: string;
    payment_id?: string | null;
    email?: string;
    name?: string;
    message?: string;
    amount?: number;
    order_code?: number;
    items?: CartLine[];
    is_test?: boolean;
  };
};

function jobToPayment(job: QueueJob["message"]): PaymentRecord {
  return {
    id: job.payment_id || "00000000-0000-0000-0000-000000000001",
    orderCode: Number(job.order_code ?? 0),
    amount: Number(job.amount ?? 0),
    description: "thank_you",
    status: "paid",
    qrPayload: "",
    checkoutUrl: null,
    payosLinkId: null,
    bin: null,
    accountNumber: null,
    transferDescription: null,
    email: (job.email ?? "").trim().toLowerCase(),
    name: job.name ?? "Bạn",
    message: job.message ?? "",
    items: Array.isArray(job.items) ? job.items : [],
    lantern: "round",
    createdAt: Date.now(),
  };
}

/** Rút job từ Supabase Queue (pgmq) và gửi SMTP — không chạy trong transaction thanh toán. */
export async function processThankYouEmailJobs(limit = 10) {
  const jobs = await sql<QueueJob[]>`
    select msg_id, message
    from public.read_thank_you_email_jobs(90, ${limit})
  `;

  let sent = 0;
  let archived = 0;
  const failures: Array<{ msgId: number; error: string; to?: string }> = [];

  for (const job of jobs) {
    const payload = job.message ?? {};
    const payment = jobToPayment(payload);
    try {
      if (!payment.email) throw new Error("Thiếu email người nhận.");
      const result = await sendThankYouEmail(payment);
      if (!result.sent) {
        throw new Error(result.reason ?? "SMTP chưa sẵn sàng.");
      }
      sent += 1;
      if (payload.payment_id) {
        await sql`
          select public.mark_thank_you_email_sent(${payload.payment_id}::uuid)
        `;
      }
      await sql`
        select public.archive_thank_you_email_job(${job.msg_id}::bigint)
      `;
      archived += 1;
    } catch (error) {
      failures.push({
        msgId: job.msg_id,
        to: payment.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    read: jobs.length,
    sent,
    archived,
    failures,
  };
}
