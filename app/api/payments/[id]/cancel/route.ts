import { getPayment, markPaymentCancelled } from "@/lib/donations-repo";
import { publishPaymentStatus } from "@/lib/payment-events";
import { getPayOS } from "@/lib/payos";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payment = await getPayment(id);
    if (!payment) {
      return Response.json(
        { error: "Không tìm thấy thanh toán." },
        { status: 404 },
      );
    }

    if (payment.status === "paid") {
      return Response.json(
        { error: "Đơn đã thanh toán, không hủy được." },
        { status: 409 },
      );
    }

    if (payment.status === "pending") {
      const payos = getPayOS();
      let payosError: string | null = null;

      try {
        if (payment.payosLinkId) {
          await payos.paymentRequests.cancel(
            payment.payosLinkId,
            "Người dùng hủy / chỉnh đơn",
          );
        } else {
          await payos.paymentRequests.cancel(
            payment.orderCode,
            "Người dùng hủy / chỉnh đơn",
          );
        }
      } catch (error) {
        payosError =
          error instanceof Error ? error.message : "PayOS cancel failed";
        console.warn("[cancel PayOS]", payosError);
        // Thử thêm bằng orderCode nếu hủy bằng linkId thất bại.
        if (payment.payosLinkId) {
          try {
            await payos.paymentRequests.cancel(
              payment.orderCode,
              "Người dùng hủy / chỉnh đơn",
            );
            payosError = null;
          } catch (retryError) {
            console.warn("[cancel PayOS retry orderCode]", retryError);
          }
        }
      }

      await markPaymentCancelled(payment.id);
      publishPaymentStatus(payment.id, "cancelled");

      return Response.json({
        ok: true,
        status: "cancelled",
        payosCancelled: !payosError,
        payosError,
      });
    }

    // Đã cancelled trước đó
    return Response.json({ ok: true, status: payment.status });
  } catch (error) {
    console.error("[POST /api/payments/:id/cancel]", error);
    return Response.json({ error: "Không hủy được đơn." }, { status: 500 });
  }
}
