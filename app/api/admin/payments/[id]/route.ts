import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-donations";
import { LANTERN_KINDS } from "@/lib/catalog";
import {
  cancelAdminPayment,
  clearThankYouEmailFlag,
  markAdminPaymentPaid,
  updateAdminPayment,
} from "@/lib/admin-payments";
import type { CartLine, LanternKind, ProductId } from "@/lib/types";

export const runtime = "nodejs";

type PatchBody = {
  action?: "cancel" | "markPaid" | "clearMail" | "update";
  name?: string;
  email?: string;
  message?: string;
  amount?: number;
  description?: string;
  lantern?: string;
  items?: CartLine[];
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const action = body.action ?? "update";

  try {
    if (action === "cancel") {
      const result = await cancelAdminPayment(id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, payment: result.payment });
    }

    if (action === "markPaid") {
      const result = await markAdminPaymentPaid(id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, payment: result.payment });
    }

    if (action === "clearMail") {
      const result = await clearThankYouEmailFlag(id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, payment: result.payment });
    }

    const lantern = body.lantern as LanternKind | undefined;
    if (
      body.name == null ||
      body.email == null ||
      body.message == null ||
      body.amount == null ||
      body.description == null ||
      !lantern ||
      !LANTERN_KINDS.includes(lantern) ||
      !Array.isArray(body.items)
    ) {
      return NextResponse.json(
        { error: "Thiếu trường cập nhật payment." },
        { status: 400 },
      );
    }

    const result = await updateAdminPayment(id, {
      name: body.name,
      email: body.email,
      message: body.message,
      amount: body.amount,
      description: body.description,
      lantern,
      items: body.items.map((line) => ({
        productId: line.productId as ProductId,
        quantity: Number(line.quantity) || 0,
      })),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, payment: result.payment });
  } catch (error) {
    console.error("[admin payment patch]", error);
    return NextResponse.json(
      { error: "Không cập nhật được payment." },
      { status: 500 },
    );
  }
}
