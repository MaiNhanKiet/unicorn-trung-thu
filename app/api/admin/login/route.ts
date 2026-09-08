import { NextResponse } from "next/server";
import { authenticateAdmin, createAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

type Body = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Payload không hợp lệ." }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json(
      { error: "Nhập tài khoản và mật khẩu." },
      { status: 400 },
    );
  }

  try {
    const admin = await authenticateAdmin(username, password);
    if (!admin) {
      return NextResponse.json(
        { error: "Sai tài khoản hoặc mật khẩu." },
        { status: 401 },
      );
    }
    await createAdminSession(admin);
    return NextResponse.json({ ok: true, username: admin.username });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không đăng nhập được.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
