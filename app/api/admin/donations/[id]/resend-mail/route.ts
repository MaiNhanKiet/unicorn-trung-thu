import { NextResponse } from "next/server";
import { requireAdminApi, resendThankYouMail } from "@/lib/admin-donations";

export const runtime = "nodejs";

type Params = { id: string };

export async function POST(
  _request: Request,
  context: { params: Promise<Params> },
) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  }

  try {
    const result = await resendThankYouMail(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      thankYouEmailSentAt: result.thankYouEmailSentAt,
    });
  } catch (error) {
    console.error("[admin resend mail]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gửi lại mail thất bại.",
      },
      { status: 500 },
    );
  }
}
