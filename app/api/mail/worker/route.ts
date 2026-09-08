import { processThankYouEmailJobs } from "@/lib/mail-queue";

export async function POST(request: Request) {
  try {
    const secret = process.env.MAIL_WORKER_SECRET?.trim();
    const header = request.headers.get("x-worker-secret")?.trim();
    if (!secret || header !== secret) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const result = await processThankYouEmailJobs(10);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[mail worker]", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Worker xử lý mail lỗi.",
      },
      { status: 500 },
    );
  }
}
