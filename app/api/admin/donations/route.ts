import { NextResponse } from "next/server";
import {
  getAdminOverviewStats,
  queryAdminDonations,
  requireAdminApi,
  type AdminSortKey,
  type MailFilter,
} from "@/lib/admin-donations";

export const runtime = "nodejs";

const SORT_KEYS = new Set<AdminSortKey>([
  "createdAt",
  "amount",
  "name",
  "email",
  "mailSent",
]);

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
  const search = url.searchParams.get("search") ?? "";
  const mailRaw = url.searchParams.get("mail") ?? "all";
  const mailFilter = (
    ["all", "sent", "pending"].includes(mailRaw) ? mailRaw : "all"
  ) as MailFilter;
  const sortRaw = url.searchParams.get("sort") ?? "createdAt";
  const sort = (SORT_KEYS.has(sortRaw as AdminSortKey)
    ? sortRaw
    : "createdAt") as AdminSortKey;
  const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const includeStats = url.searchParams.get("stats") === "1";

  try {
    const [list, stats] = await Promise.all([
      queryAdminDonations({
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 20,
        search,
        mailFilter,
        sort,
        sortDir,
      }),
      includeStats ? getAdminOverviewStats() : Promise.resolve(null),
    ]);

    return NextResponse.json({
      ...list,
      stats,
    });
  } catch (error) {
    console.error("[admin donations]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không tải được danh sách.",
      },
      { status: 500 },
    );
  }
}
