import { NextResponse } from "next/server";
import {
  setDonationHidden,
  updateAdminDonation,
  requireAdminApi,
} from "@/lib/admin-donations";
import { LANTERN_KINDS } from "@/lib/catalog";
import type { CartLine, LanternKind, ProductId } from "@/lib/types";

export const runtime = "nodejs";

type PatchBody = {
  name?: string;
  email?: string;
  message?: string;
  amount?: number;
  lantern?: string;
  items?: CartLine[];
  hidden?: boolean;
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

  try {
    if (typeof body.hidden === "boolean") {
      const result = await setDonationHidden(id, body.hidden);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, donation: result.donation });
    }

    const lantern = body.lantern as LanternKind | undefined;
    if (
      body.name == null ||
      body.email == null ||
      body.message == null ||
      body.amount == null ||
      !lantern ||
      !LANTERN_KINDS.includes(lantern) ||
      !Array.isArray(body.items)
    ) {
      return NextResponse.json(
        { error: "Thiếu trường cập nhật donation." },
        { status: 400 },
      );
    }

    const items = body.items.map((line) => ({
      productId: line.productId as ProductId,
      quantity: Number(line.quantity) || 0,
    }));

    const result = await updateAdminDonation(id, {
      name: body.name,
      email: body.email,
      message: body.message,
      amount: body.amount,
      lantern,
      items,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, donation: result.donation });
  } catch (error) {
    console.error("[admin donation patch]", error);
    return NextResponse.json(
      { error: "Không cập nhật được donation." },
      { status: 500 },
    );
  }
}
