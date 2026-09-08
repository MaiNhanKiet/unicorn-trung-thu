import { NextResponse } from "next/server";
import { listPaidPaymentsByEmail } from "@/lib/donations-repo";
import { requireAdminApi } from "@/lib/admin-donations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Thiếu email." }, { status: 400 });
  }

  try {
    const payments = await listPaidPaymentsByEmail(email);
    return NextResponse.json({
      payments: payments.map((payment) => ({
        id: payment.id,
        orderCode: payment.orderCode,
        amount: payment.amount,
        name: payment.name,
        message: payment.message,
        items: payment.items,
        createdAt: payment.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin payments by email]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không tải được lịch sử giao dịch.",
      },
      { status: 500 },
    );
  }
}
