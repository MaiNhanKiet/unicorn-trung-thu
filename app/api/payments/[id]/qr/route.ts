import { getPayment } from "@/lib/donations-repo";
import QRCode from "qrcode";

export async function GET(
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

    const png = await QRCode.toBuffer(payment.qrPayload, {
      type: "png",
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/payments/:id/qr]", error);
    return Response.json({ error: "Không tạo được mã QR." }, { status: 500 });
  }
}
