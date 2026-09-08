import { getDonationsTotals } from "@/lib/donations-repo";
import { publishTotals, subscribeTotals } from "@/lib/total-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let cleaned = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let dbWatch: ReturnType<typeof setInterval> | undefined;
  let unsubscribe = () => {};
  let lastTotal = -1;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const close = () => {
        if (cleaned) return;
        cleaned = true;
        clearInterval(heartbeat);
        clearInterval(dbWatch);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      void getDonationsTotals().then((totals) => {
        lastTotal = totals.total;
        send({ type: "total", ...totals });
      });

      unsubscribe = subscribeTotals((payload) => {
        lastTotal = payload.total;
        send({ type: "total", ...payload });
      });

      heartbeat = setInterval(() => {
        send({ type: "ping" });
      }, 20_000);

      // Fallback multi-instance / webhook trên instance khác.
      dbWatch = setInterval(() => {
        void getDonationsTotals().then((totals) => {
          if (totals.total === lastTotal) return;
          lastTotal = totals.total;
          publishTotals(totals);
          send({ type: "total", ...totals });
        });
      }, 3_000);

      request.signal.addEventListener("abort", close);
    },
    cancel() {
      cleaned = true;
      clearInterval(heartbeat);
      clearInterval(dbWatch);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
