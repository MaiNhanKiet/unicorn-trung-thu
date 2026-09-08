import { NextResponse } from "next/server";
import { changeAdminPassword } from "@/lib/admin-auth";
import { requireAdminApi } from "@/lib/admin-donations";

type Body = {
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Thiếu mật khẩu hiện tại hoặc mật khẩu mới." },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Mật khẩu mới tối thiểu 8 ký tự." },
      { status: 400 },
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "Mật khẩu mới phải khác mật khẩu hiện tại." },
      { status: 400 },
    );
  }

  try {
    const result = await changeAdminPassword(
      session.id,
      currentPassword,
      newPassword,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin password]", error);
    return NextResponse.json(
      { error: "Không đổi được mật khẩu." },
      { status: 500 },
    );
  }
}
