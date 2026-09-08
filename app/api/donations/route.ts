import { NextRequest } from "next/server";
import { findDonationsByEmail, listDonations } from "@/lib/donations-repo";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    const donations = email
      ? await findDonationsByEmail(email)
      : await listDonations();
    return Response.json({ donations });
  } catch (error) {
    console.error("[GET /api/donations]", error);
    return Response.json(
      { error: "Không tải được danh sách quyên góp." },
      { status: 500 },
    );
  }
}
