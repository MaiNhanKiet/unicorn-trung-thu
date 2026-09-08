import { getPayment } from "@/lib/donations-repo";
import { buildVietQrImageUrl } from "@/lib/vietqr";
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

    // Trùng ảnh đang hiện trên web (VietQR có branding).
    if (payment.bin && payment.accountNumber) {
      const imageUrl = buildVietQrImageUrl({
        bin: payment.bin,
        accountNumber: payment.accountNumber,
        amount: payment.amount,
        orderCode: payment.orderCode,
        description: payment.transferDescription,
      });
      const upstream = await fetch(imageUrl, { cache: "no-store" });
      if (upstream.ok) {
        const bytes = await upstream.arrayBuffer();
        const contentType =
          upstream.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        return new Response(bytes, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="vietqr-don-${payment.orderCode}.${ext}"`,
            "Cache-Control": "no-store",
          },
        });
      }
    }

    // Fallback: QR thuần từ payload nếu VietQR không lấy được.
    const png = await QRCode.toBuffer(payment.qrPayload, {
      type: "png",
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="vietqr-don-${payment.orderCode}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/payments/:id/qr]", error);
    return Response.json({ error: "Không tạo được mã QR." }, { status: 500 });
  }
}
