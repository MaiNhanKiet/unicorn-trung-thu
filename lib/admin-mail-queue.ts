import "server-only";
import { sql } from "@/lib/db";
import type { CartLine } from "@/lib/types";

export type MailQueueJob = {
  msgId: number;
  readCt: number;
  enqueuedAt: number;
  visibleAt: number;
  status: "waiting" | "processing";
  paymentId: string | null;
  email: string;
  name: string;
  amount: number;
  orderCode: number | null;
  items: CartLine[];
  isTest: boolean;
};

export type MailQueueSnapshot = {
  queueLength: number;
  waiting: number;
  processing: number;
  totalMessages: number;
  scrapedAt: number;
  jobs: MailQueueJob[];
};

type QueueRow = {
  msg_id: number | string;
  read_ct: number;
  enqueued_at: string | Date;
  vt: string | Date;
  processing: boolean;
  message: Record<string, unknown> | string | null;
};

type MetricsRow = {
  queue_length: number;
  total_messages: number;
  scrape_time: string | Date;
};

function toMs(value: string | Date | null | undefined) {
  if (!value) return Date.now();
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function parseMessage(raw: QueueRow["message"]) {
  if (!raw) return {} as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw;
}

function parseItems(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (line): line is CartLine =>
      Boolean(line) &&
      typeof line === "object" &&
      typeof (line as CartLine).productId === "string" &&
      typeof (line as CartLine).quantity === "number",
  );
}

export async function getMailQueueSnapshot(): Promise<MailQueueSnapshot> {
  const [metricsRows, jobRows] = await Promise.all([
    sql<MetricsRow[]>`
      select queue_length, total_messages, scrape_time
      from pgmq.metrics('thank_you_emails')
    `,
    sql<QueueRow[]>`
      select
        msg_id,
        read_ct,
        enqueued_at,
        vt,
        (vt > now()) as processing,
        message
      from pgmq.q_thank_you_emails
      order by enqueued_at asc
      limit 100
    `,
  ]);

  const metrics = metricsRows[0];
  const jobs: MailQueueJob[] = jobRows.map((row) => {
    const message = parseMessage(row.message);
    const processing = Boolean(row.processing);
    return {
      msgId: Number(row.msg_id),
      readCt: Number(row.read_ct ?? 0),
      enqueuedAt: toMs(row.enqueued_at),
      visibleAt: toMs(row.vt),
      status: processing ? "processing" : "waiting",
      paymentId:
        typeof message.payment_id === "string" ? message.payment_id : null,
      email: String(message.email ?? "").trim().toLowerCase(),
      name: String(message.name ?? "—"),
      amount: Number(message.amount ?? 0),
      orderCode:
        message.order_code == null ? null : Number(message.order_code),
      items: parseItems(message.items),
      isTest: Boolean(message.is_test),
    };
  });

  const waiting = jobs.filter((job) => job.status === "waiting").length;
  const processing = jobs.filter((job) => job.status === "processing").length;

  return {
    queueLength: Number(metrics?.queue_length ?? jobs.length),
    waiting,
    processing,
    totalMessages: Number(metrics?.total_messages ?? 0),
    scrapedAt: toMs(metrics?.scrape_time) || Date.now(),
    jobs,
  };
}
