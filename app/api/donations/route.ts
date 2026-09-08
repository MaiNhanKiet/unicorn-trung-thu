import { NextRequest } from "next/server";
import {
  findDonationsByEmail,
  listDonationsPage,
} from "@/lib/donations-repo";

const DEFAULT_LIMIT = 24;

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (email) {
      const donations = await findDonationsByEmail(email);
      const total = donations.reduce((sum, item) => sum + item.amount, 0);
      return Response.json({
        donations,
        total,
        count: donations.length,
        hasMore: false,
      });
    }

    const limit = Number(request.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
    const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
    const page = await listDonationsPage(
      Number.isFinite(limit) ? limit : DEFAULT_LIMIT,
      Number.isFinite(offset) ? offset : 0,
    );
    return Response.json(page);
  } catch (error) {
    console.error("[GET /api/donations]", error);
    return Response.json(
      { error: "Không tải được danh sách quyên góp." },
      { status: 500 },
    );
  }
}
