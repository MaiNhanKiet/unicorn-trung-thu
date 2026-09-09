import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-donations";
import { listPaidPaymentsByEmail } from "@/lib/donations-repo";
import {
  queryAdminPayments,
  type PaymentStatusFilter,
} from "@/lib/admin-payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim() ?? "";

  // Lịch sử theo email (dialog chi tiết donation)
  if (email) {
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

  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
  const search = url.searchParams.get("search") ?? "";
  const statusRaw = url.searchParams.get("status") ?? "all";
  const status = (
    ["all", "pending", "paid", "cancelled"].includes(statusRaw)
      ? statusRaw
      : "all"
  ) as PaymentStatusFilter;

  try {
    const list = await queryAdminPayments({
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      search,
      status,
    });
    return NextResponse.json(list);
  } catch (error) {
    console.error("[admin payments list]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không tải được danh sách payment.",
      },
      { status: 500 },
    );
  }
}
