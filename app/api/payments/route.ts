import { NextRequest } from "next/server";
import { PRODUCT_MAP } from "@/lib/catalog";
import { insertPayment } from "@/lib/donations-repo";
import { lanternKindFromSeed } from "@/lib/format";
import { appBaseUrl, getPayOS, payosDescription } from "@/lib/payos";
import type { CartLine, PaymentRecord, ProductId } from "@/lib/types";
import { buildVietQrImageUrl } from "@/lib/vietqr";

const PRODUCT_IDS: ProductId[] = ["nuoc-sam", "banh-trang", "com-chay"];

function isProductId(value: string): value is ProductId {
  return PRODUCT_IDS.includes(value as ProductId);
}

function nextOrderCode() {
  return Math.floor(Date.now() % 1e11) * 100 + Math.floor(Math.random() * 100);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      message?: string;
      items?: CartLine[];
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const name = body.name?.trim() ?? "";
    const items = (body.items ?? []).filter(
      (line) =>
        isProductId(line.productId) &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0,
    );

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Email không hợp lệ." }, { status: 400 });
    }
    if (!name) {
      return Response.json(
        { error: "Tên hiện trên lồng đèn là bắt buộc." },
        { status: 400 },
      );
    }
    if (items.length === 0) {
      return Response.json(
        { error: "Hãy chọn ít nhất một món." },
        { status: 400 },
      );
    }

    const amount = items.reduce((sum, line) => {
      return sum + PRODUCT_MAP[line.productId].price * line.quantity;
    }, 0);

    const id = crypto.randomUUID();
    const orderCode = nextOrderCode();
    const message = (body.message?.trim() || "").slice(0, 140);
    const transferDescription = payosDescription(orderCode);
    const base = appBaseUrl(request);
    const returnUrl = `${base}/donate/pay?paymentId=${id}`;
    const cancelUrl = `${base}/donate/pay?paymentId=${id}&cancelled=1`;

    const payos = getPayOS();
    const link = await payos.paymentRequests.create({
      orderCode,
      amount,
      description: transferDescription,
      returnUrl,
      cancelUrl,
      buyerName: name.slice(0, 40),
      buyerEmail: email,
      items: items.map((line) => ({
        name: PRODUCT_MAP[line.productId].name,
        quantity: line.quantity,
        price: PRODUCT_MAP[line.productId].price,
      })),
    });

    const payment: PaymentRecord = {
      id,
      orderCode,
      amount,
      description: `Gây quỹ Trung Thu #${orderCode}`,
      status: "pending",
      qrPayload: link.qrCode,
      checkoutUrl: link.checkoutUrl,
      payosLinkId: link.paymentLinkId,
      bin: link.bin,
      accountNumber: link.accountNumber,
      transferDescription: link.description || transferDescription,
      email,
      name: name.slice(0, 40),
      message,
      items,
      lantern: lanternKindFromSeed(id + email),
      createdAt: Date.now(),
    };

    await insertPayment(payment);

    const qrImageUrl = buildVietQrImageUrl({
      bin: payment.bin!,
      accountNumber: payment.accountNumber!,
      amount: payment.amount,
      orderCode: payment.orderCode,
      description: payment.transferDescription,
    });

    return Response.json({
      paymentId: payment.id,
      orderCode: payment.orderCode,
      amount: payment.amount,
      status: payment.status,
      checkoutUrl: `/donate/pay?paymentId=${payment.id}`,
      qrImageUrl,
    });
  } catch (error) {
    console.error("[POST /api/payments]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Không tạo được thanh toán PayOS.";
    return Response.json({ error: message }, { status: 500 });
  }
}
