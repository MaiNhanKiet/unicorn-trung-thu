import {
  completePaymentIfPending,
  getPayment,
} from "@/lib/donations-repo";
import { buildVietQrImageUrl } from "@/lib/vietqr";

function paymentJson(payment: NonNullable<Awaited<ReturnType<typeof getPayment>>>) {
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
    paymentId: payment.id,
    orderCode: payment.orderCode,
    amount: payment.amount,
    status: payment.status,
    email: payment.email,
    name: payment.name,
    message: payment.message,
    items: payment.items,
    lantern: payment.lantern,
    description: payment.description,
    transferDescription: payment.transferDescription,
    bin: payment.bin,
    accountNumber: payment.accountNumber,
    qrImageUrl,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payment = await getPayment(id);
    if (!payment) {
      return Response.json(
        { error: "Không tìm thấy giao dịch." },
        { status: 404 },
      );
    }

    return Response.json(paymentJson(payment));
  } catch (error) {
    console.error("[GET /api/payments/:id]", error);
    return Response.json(
      { error: "Không tải được giao dịch." },
      { status: 500 },
    );
  }
}

/** Đồng bộ trạng thái từ PayOS (poll / return URL). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payment = await getPayment(id);
    if (!payment) {
      return Response.json(
        { error: "Không tìm thấy giao dịch." },
        { status: 404 },
      );
    }

    if (payment.status === "paid") {
      await completePaymentIfPending(payment);
      return Response.json(paymentJson(payment));
    }

    const { getPayOS } = await import("@/lib/payos");
    const payos = getPayOS();
    const link = await payos.paymentRequests.get(payment.orderCode);

    if (link.status === "PAID") {
      const paid = await completePaymentIfPending(payment);
      return Response.json(paymentJson(paid));
    }

    if (link.status === "CANCELLED" || link.status === "EXPIRED") {
      const { markPaymentCancelled } = await import("@/lib/donations-repo");
      const cancelled = await markPaymentCancelled(payment.id);
      return Response.json(
        paymentJson(cancelled ?? { ...payment, status: "cancelled" }),
      );
    }

    return Response.json(paymentJson(payment));
  } catch (error) {
    console.error("[POST /api/payments/:id sync]", error);
    return Response.json(
      { error: "Không đồng bộ được PayOS." },
      { status: 500 },
    );
  }
}
