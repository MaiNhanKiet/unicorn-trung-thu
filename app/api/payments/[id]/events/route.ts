import {
  completePaymentIfPending,
  getPayment,
  markPaymentCancelled,
} from "@/lib/donations-repo";
import { publishPaymentStatus, subscribePaymentStatus } from "@/lib/payment-events";
import { getPayOS } from "@/lib/payos";
import { buildVietQrImageUrl } from "@/lib/vietqr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function snapshot(payment: NonNullable<Awaited<ReturnType<typeof getPayment>>>) {
  const qrImageUrl =
    payment.bin && payment.accountNumber
      ? buildVietQrImageUrl({
          bin: payment.bin,
          accountNumber: payment.accountNumber,
          amount: payment.amount,
          orderCode: payment.orderCode,
          description: payment.transferDescription,
        })
      : null;

  return {
    type: "status" as const,
    paymentId: payment.id,
    orderCode: payment.orderCode,
    amount: payment.amount,
    status: payment.status,
    description: payment.description,
    transferDescription: payment.transferDescription,
    email: payment.email,
    name: payment.name,
    message: payment.message,
    items: payment.items,
    qrImageUrl,
  };
}

async function syncFromPayOS(id: string) {
  const payment = await getPayment(id);
  if (!payment || payment.status !== "pending") return payment;

  try {
    const payos = getPayOS();
    const link = await payos.paymentRequests.get(payment.orderCode);
    if (link.status === "PAID") {
      const paid = await completePaymentIfPending(payment);
      publishPaymentStatus(paid.id, paid.status);
      return paid;
    }
    if (link.status === "CANCELLED" || link.status === "EXPIRED") {
      const cancelled = await markPaymentCancelled(payment.id);
      if (cancelled) publishPaymentStatus(cancelled.id, cancelled.status);
      return cancelled;
    }
  } catch (error) {
    console.warn("[SSE sync PayOS]", error);
  }
  return payment;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const initial = await getPayment(id);
  if (!initial) {
    return Response.json({ error: "Không tìm thấy giao dịch." }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleaned = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let dbWatch: ReturnType<typeof setInterval> | undefined;
  let payosWatch: ReturnType<typeof setInterval> | undefined;
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const close = () => {
        if (cleaned) return;
        cleaned = true;
        clearInterval(heartbeat);
        clearInterval(dbWatch);
        clearInterval(payosWatch);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      send(snapshot(initial));

      if (initial.status !== "pending") {
        close();
        return;
      }

      // Đồng bộ PayOS ngay khi mở SSE (user có thể vừa CK xong / webhook chậm).
      void syncFromPayOS(id).then((current) => {
        if (!current) return;
        send(snapshot(current));
        if (current.status !== "pending") close();
      });

      unsubscribe = subscribePaymentStatus(id, (event) => {
        if (event.type !== "status" || !event.status) return;
        void getPayment(id).then((current) => {
          if (!current) return;
          send(snapshot(current));
          if (current.status !== "pending") close();
        });
      });

      heartbeat = setInterval(() => {
        send({ type: "ping" });
      }, 20_000);

      // DB rẻ hơn PayOS — bắt kịp webhook nhanh.
      dbWatch = setInterval(() => {
        void getPayment(id).then((current) => {
          if (!current) return;
          if (current.status !== "pending") {
            send(snapshot(current));
            close();
          }
        });
      }, 5_000);

      // Fallback khi chưa có webhook / webhook chậm.
      payosWatch = setInterval(() => {
        void syncFromPayOS(id).then((current) => {
          if (!current) return;
          if (current.status !== "pending") {
            send(snapshot(current));
            close();
          }
        });
      }, 8_000);

      request.signal.addEventListener("abort", close);
    },
    cancel() {
      cleaned = true;
      clearInterval(heartbeat);
      clearInterval(dbWatch);
      clearInterval(payosWatch);
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
