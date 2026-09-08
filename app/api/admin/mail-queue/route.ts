import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-donations";
import { getMailQueueSnapshot } from "@/lib/admin-mail-queue";

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const queue = await getMailQueueSnapshot();
    return NextResponse.json({ ok: true, queue });
  } catch (error) {
    console.error("[admin mail queue]", error);
    return NextResponse.json(
      { error: "Không đọc được queue mail." },
      { status: 500 },
    );
  }
}
