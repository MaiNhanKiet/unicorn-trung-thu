import {
  completePaymentIfPending,
  getPaymentByOrderCode,
} from "@/lib/donations-repo";
import { getPayOS } from "@/lib/payos";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payos = getPayOS();
    const data = await payos.webhooks.verify(body);

    if (data.code === "00") {
      const payment = await getPaymentByOrderCode(data.orderCode);
      if (payment) {
        await completePaymentIfPending(payment);
      } else {
        console.warn(
          "[PayOS webhook] Không tìm thấy đơn orderCode=",
          data.orderCode,
        );
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[POST /api/payos/webhook]", error);
    return Response.json(
      { error: "Webhook không hợp lệ." },
      { status: 400 },
    );
  }
}
