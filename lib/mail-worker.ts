import "server-only";

/**
 * Báo worker xử lý Queue sau khi commit.
 * Ưu tiên Next.js worker (SMTP trong .env). Edge Function chỉ là dự phòng.
 */
export function kickThankYouEmailWorker() {
  const secret = process.env.MAIL_WORKER_SECRET?.trim();
  if (!secret) {
    console.warn("[mail worker] thiếu MAIL_WORKER_SECRET");
    return;
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  void fetch(`${appUrl}/api/mail/worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-secret": secret,
    },
    body: "{}",
  }).catch((error) => {
    console.error("[mail worker kick local]", error);
  });

  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
  if (!supabaseUrl) return;

  void fetch(`${supabaseUrl}/functions/v1/process-thank-you-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-secret": secret,
    },
    body: "{}",
  }).catch(() => {
    /* Edge có thể chưa cấu hình secrets — local worker đã lo */
  });
}
