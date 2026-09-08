"use client";

import Image from "next/image";
import { X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { LANTERN_ASSETS, PRODUCT_MAP } from "@/lib/catalog";
import type { AdminSortKey, MailFilter } from "@/lib/admin-types";
import type { CartLine } from "@/lib/types";
import { formatVnd } from "@/lib/format";
import { PasswordField } from "@/components/password-field";

type DonationRow = {
  id: string;
  paymentId: string;
  email: string;
  name: string;
  message: string;
  amount: number;
  items: CartLine[];
  lantern: string;
  createdAt: number;
  thankYouEmailSentAt: number | null;
};

type ProductSold = {
  productId: string;
  name: string;
  quantity: number;
};

type Stats = {
  totalAmount: number;
  totalCount: number;
  soldByProduct: ProductSold[];
};

const PAGE_SIZES = [10, 20, 50, 100] as const;

const LANTERN_LABEL: Record<string, string> = {
  round: "Tròn",
  carp: "Cá chép",
  pagoda: "Lầu",
  rabbit: "Thỏ",
};

function itemsLabel(items: CartLine[]) {
  if (!items.length) return "—";
  return items
    .map((line) => {
      const name = PRODUCT_MAP[line.productId]?.name ?? line.productId;
      return `${name}×${line.quantity}`;
    })
    .join(", ");
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button type="button" className="admin-sort" onClick={onClick}>
      {label}
      <span aria-hidden="true">{active ? (dir === "asc" ? " ↑" : " ↓") : ""}</span>
    </button>
  );
}

function AdminDetailDialog({
  donation,
  onClose,
  onResend,
  resending,
}: {
  donation: DonationRow;
  onClose: () => void;
  onResend: () => void;
  resending: boolean;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<
    {
      id: string;
      orderCode: number;
      amount: number;
      items: CartLine[];
      message: string;
      createdAt: number;
    }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const lantern =
    LANTERN_ASSETS[donation.lantern as keyof typeof LANTERN_ASSETS] ??
    LANTERN_ASSETS.round;
  const sent = Boolean(donation.thankYouEmailSentAt);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/payments?email=${encodeURIComponent(donation.email)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          payments?: typeof history;
          error?: string;
        };
        if (cancelled) return;
        if (response.ok) setHistory(data.payments ?? []);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [donation.email]);

  if (!mounted) return null;

  return createPortal(
    <div className="donor-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="donor-panel admin-detail-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Chi tiết quyên góp</p>
            <h2 id={titleId} className="mt-2 text-xl text-[var(--color-gold)] sm:text-2xl">
              {donation.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn-icon shrink-0"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="admin-detail-hero">
          <Image
            src={lantern.src}
            alt=""
            width={72}
            height={72}
            className="object-contain"
            unoptimized
          />
          <div>
            <p className="text-3xl font-semibold tabular-nums text-[var(--color-gold)]">
              {formatVnd(donation.amount)}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {LANTERN_LABEL[donation.lantern] ?? donation.lantern} · tổng cộng dồn
            </p>
          </div>
        </div>

        <dl className="donor-meta">
          <div>
            <dt>Email</dt>
            <dd>{donation.email}</dd>
          </div>
          <div>
            <dt>Món (đã cộng dồn)</dt>
            <dd>
              <ul className="mt-1 space-y-1">
                {donation.items.length === 0 ? (
                  <li>—</li>
                ) : (
                  donation.items.map((line) => (
                    <li key={line.productId}>
                      {PRODUCT_MAP[line.productId]?.name ?? line.productId}
                      {" · "}
                      <span className="tabular-nums">×{line.quantity}</span>
                    </li>
                  ))
                )}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Lời nhắn gần nhất</dt>
            <dd>{donation.message || "—"}</dd>
          </div>
          <div>
            <dt>Trạng thái mail (đơn gần nhất)</dt>
            <dd>
              <span className={sent ? "admin-badge is-sent" : "admin-badge is-pending"}>
                {sent ? "Đã gửi" : "Chưa gửi"}
              </span>
              {sent && donation.thankYouEmailSentAt ? (
                <span className="ml-2 text-sm text-[var(--color-muted-foreground)]">
                  {new Date(donation.thankYouEmailSentAt).toLocaleString("vi-VN")}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Lịch sử giao dịch</dt>
            <dd>
              {historyLoading ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Đang tải…
                </p>
              ) : history.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Chưa có giao dịch.
                </p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {history.map((payment) => (
                    <li
                      key={payment.id}
                      className="rounded-xl border border-[var(--color-border)] px-3 py-2"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">#{payment.orderCode}</span>
                        <span className="tabular-nums text-[var(--color-gold)]">
                          {formatVnd(payment.amount)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {new Date(payment.createdAt).toLocaleString("vi-VN")}
                      </p>
                      <p className="mt-1 text-sm">
                        {itemsLabel(payment.items)}
                      </p>
                      {payment.message ? (
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                          {payment.message}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="admin-action"
            disabled={resending}
            onClick={onResend}
          >
            {resending ? "Đang gửi…" : "Gửi lại mail"}
          </button>
          <button type="button" className="btn-icon px-4" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type MailQueueJob = {
  msgId: number;
  readCt: number;
  enqueuedAt: number;
  visibleAt: number;
  status: "waiting" | "processing";
  paymentId: string | null;
  email: string;
  name: string;
  amount: number;
  orderCode: number | null;
  items: CartLine[];
  isTest: boolean;
};

type MailQueueSnapshot = {
  queueLength: number;
  waiting: number;
  processing: number;
  totalMessages: number;
  scrapedAt: number;
  jobs: MailQueueJob[];
};

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="donor-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="donor-panel admin-detail-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Bảo mật</p>
            <h2
              id={titleId}
              className="mt-2 text-xl text-[var(--color-gold)] sm:text-2xl"
            >
              Đổi mật khẩu
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn-icon shrink-0"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            setOk("");
            if (newPassword.length < 8) {
              setError("Mật khẩu mới tối thiểu 8 ký tự.");
              return;
            }
            if (newPassword !== confirmPassword) {
              setError("Xác nhận mật khẩu không khớp.");
              return;
            }
            setSaving(true);
            void (async () => {
              try {
                const response = await fetch("/api/admin/password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ currentPassword, newPassword }),
                });
                const data = (await response.json()) as { error?: string };
                if (!response.ok) {
                  setError(data.error ?? "Không đổi được mật khẩu.");
                  return;
                }
                setOk("Đã đổi mật khẩu.");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              } catch {
                setError("Mất kết nối. Thử lại.");
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          <label htmlFor={currentId} className="label">
            Mật khẩu hiện tại
          </label>
          <PasswordField
            id={currentId}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
          <label htmlFor={nextId} className="label mt-1">
            Mật khẩu mới
          </label>
          <PasswordField
            id={nextId}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
          />
          <label htmlFor={confirmId} className="label mt-1">
            Xác nhận mật khẩu mới
          </label>
          <PasswordField
            id={confirmId}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
          {error ? <p className="admin-error px-0">{error}</p> : null}
          {ok ? (
            <p className="text-sm text-[var(--color-teal)]">{ok}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" className="admin-action" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu mật khẩu"}
            </button>
            <button type="button" className="btn-icon px-4" onClick={onClose}>
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function MailQueuePanel({ active }: { active: boolean }) {
  const [queue, setQueue] = useState<MailQueueSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useEffectEvent(async (silent: boolean) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/admin/mail-queue", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        queue?: MailQueueSnapshot;
      };
      if (!response.ok) {
        setError(data.error ?? "Không đọc được queue.");
        return;
      }
      setQueue(data.queue ?? null);
      setError("");
    } catch {
      setError("Mất kết nối khi đọc queue.");
    } finally {
      if (!silent) setLoading(false);
    }
  });

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      void refresh(true);
    };

    void refresh(false);
    timer = setInterval(tick, 2000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  const processing = queue?.jobs.filter((job) => job.status === "processing") ?? [];
  const waiting = queue?.jobs.filter((job) => job.status === "waiting") ?? [];

  return (
    <div className="glass admin-panel">
      <div className="admin-toolbar admin-queue-toolbar">
        <div>
          <p className="eyebrow">Realtime</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {active
              ? `Đang theo dõi · cập nhật mỗi 2s${
                  queue
                    ? ` · ${new Date(queue.scrapedAt).toLocaleTimeString("vi-VN")}`
                    : ""
                }`
              : "Tab đang tắt polling"}
          </p>
        </div>
        <div className="admin-queue-stats">
          <span className="admin-badge is-pending">
            Chờ: {queue?.waiting ?? "…"}
          </span>
          <span className="admin-badge is-processing">
            Đang xử lý: {queue?.processing ?? "…"}
          </span>
          <span className="admin-badge is-sent">
            Tổng từng vào queue: {queue?.totalMessages ?? "…"}
          </span>
        </div>
      </div>

      <div className="admin-table-wrap">
        {loading && !queue ? (
          <div className="admin-loading" role="status" aria-live="polite">
            Đang tải queue…
          </div>
        ) : null}
        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-queue-section">
          <h3 className="admin-queue-title">Worker đang xử lý</h3>
          {processing.length === 0 ? (
            <p className="admin-empty-inline">Không có job nào đang bị worker giữ.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>msg</th>
                  <th>Người nhận</th>
                  <th>Email</th>
                  <th>Số tiền</th>
                  <th>Đọc</th>
                  <th>Mở khóa lúc</th>
                </tr>
              </thead>
              <tbody>
                {processing.map((job) => (
                  <tr key={job.msgId}>
                    <td className="tabular-nums">#{job.msgId}</td>
                    <td>{job.name}</td>
                    <td>{job.email || "—"}</td>
                    <td className="tabular-nums">{formatVnd(job.amount)}</td>
                    <td className="tabular-nums">{job.readCt}</td>
                    <td>
                      {new Date(job.visibleAt).toLocaleTimeString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-queue-section">
          <h3 className="admin-queue-title">Đang chờ gửi</h3>
          {waiting.length === 0 ? (
            <p className="admin-empty-inline">Queue trống.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>msg</th>
                  <th>Người nhận</th>
                  <th>Email</th>
                  <th>Số tiền</th>
                  <th>Món</th>
                  <th>Vào queue</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((job) => (
                  <tr key={job.msgId}>
                    <td className="tabular-nums">#{job.msgId}</td>
                    <td>
                      {job.name}
                      {job.isTest ? " · test" : ""}
                    </td>
                    <td>{job.email || "—"}</td>
                    <td className="tabular-nums">{formatVnd(job.amount)}</td>
                    <td>{itemsLabel(job.items)}</td>
                    <td>
                      {new Date(job.enqueuedAt).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({ username }: { username: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"donations" | "queue">("donations");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [mailFilter, setMailFilter] = useState<MailFilter>("all");
  const [sort, setSort] = useState<AdminSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DonationRow | null>(null);
  const [, startTransition] = useTransition();

  const load = useEffectEvent(async (withStats: boolean) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        mail: mailFilter,
        sort,
        sortDir,
      });
      if (withStats || !stats) params.set("stats", "1");

      const response = await fetch(`/api/admin/donations?${params}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        donations?: DonationRow[];
        total?: number;
        totalPages?: number;
        page?: number;
        stats?: Stats | null;
      };
      if (!response.ok) {
        setError(data.error ?? "Không tải được dữ liệu.");
        return;
      }
      setRows(data.donations ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (data.stats) setStats(data.stats);
    } catch {
      setError("Mất kết nối. Thử lại.");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (tab !== "donations") return;
    void load(false);
  }, [tab, page, pageSize, search, mailFilter, sort, sortDir]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setPage(1);
        setSearch(searchInput.trim());
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, startTransition]);

  function toggleSort(key: AdminSortKey) {
    if (sort === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setSortDir(key === "name" || key === "email" ? "asc" : "desc");
    }
    setPage(1);
  }

  async function resendMail(row: DonationRow) {
    setResendingId(row.id);
    try {
      const response = await fetch(
        `/api/admin/donations/${encodeURIComponent(row.id)}/resend-mail`,
        { method: "POST" },
      );
      const data = (await response.json()) as {
        error?: string;
        thankYouEmailSentAt?: number;
      };
      if (!response.ok) {
        setError(data.error ?? "Gửi lại mail thất bại.");
        return;
      }
      const sentAt = data.thankYouEmailSentAt ?? Date.now();
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, thankYouEmailSentAt: sentAt } : item,
        ),
      );
      setSelected((current) =>
        current?.id === row.id
          ? { ...current, thankYouEmailSentAt: sentAt }
          : current,
      );
      setError("");
    } catch {
      setError("Mất kết nối khi gửi mail.");
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="admin-shell">
      <div className="glass admin-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--color-gold)]">
            Xin chào, {username}
          </h1>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-icon px-4"
            onClick={() => setPasswordOpen(true)}
          >
            Đổi mật khẩu
          </button>
          <button
            type="button"
            className="btn-icon px-4"
            disabled={loggingOut}
            onClick={() => {
              setLoggingOut(true);
              void (async () => {
                try {
                  await fetch("/api/admin/logout", { method: "POST" });
                  router.refresh();
                } finally {
                  setLoggingOut(false);
                }
              })();
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="glass admin-stat">
          <p className="eyebrow">Tổng quỹ</p>
          <p className="admin-stat__value text-[var(--color-gold)]">
            {stats ? formatVnd(stats.totalAmount) : "…"}
          </p>
        </div>
        <div className="glass admin-stat">
          <p className="eyebrow">Số lượt</p>
          <p className="admin-stat__value text-[var(--color-teal)]">
            {stats ? stats.totalCount : "…"}
          </p>
        </div>
        {(stats?.soldByProduct ?? []).map((product) => (
          <div key={product.productId} className="glass admin-stat">
            <p className="eyebrow">Đã bán · {product.name}</p>
            <p className="admin-stat__value">{product.quantity}</p>
          </div>
        ))}
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Phần admin">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "donations"}
          className={`admin-tab${tab === "donations" ? " is-active" : ""}`}
          onClick={() => setTab("donations")}
        >
          Quyên góp
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "queue"}
          className={`admin-tab${tab === "queue" ? " is-active" : ""}`}
          onClick={() => setTab("queue")}
        >
          Queue mail
        </button>
      </div>

      {tab === "queue" ? <MailQueuePanel active /> : null}

      {tab === "donations" ? (
      <div className="glass admin-panel">
        <div className="admin-toolbar">
          <input
            className="field admin-search"
            type="search"
            placeholder="Tìm tên, email, lời nhắn, id…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <label className="admin-control">
            <span>Mail</span>
            <select
              className="field"
              value={mailFilter}
              onChange={(event) => {
                setMailFilter(event.target.value as MailFilter);
                setPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="sent">Đã gửi</option>
              <option value="pending">Chưa gửi</option>
            </select>
          </label>
          <label className="admin-control">
            <span>Page size</span>
            <select
              className="field"
              value={pageSize}
              onChange={(event) => {
                setPageSize(
                  Number(event.target.value) as (typeof PAGE_SIZES)[number],
                );
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}/trang
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-icon px-4"
            disabled={loading}
            onClick={() => void load(true)}
          >
            Làm mới
          </button>
        </div>

        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-loading" role="status" aria-live="polite">
              Đang tải danh sách…
            </div>
          ) : null}
          {error ? <p className="admin-error">{error}</p> : null}

          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <SortButton
                    label="Thời gian"
                    active={sort === "createdAt"}
                    dir={sortDir}
                    onClick={() => toggleSort("createdAt")}
                  />
                </th>
                <th>
                  <SortButton
                    label="Tên"
                    active={sort === "name"}
                    dir={sortDir}
                    onClick={() => toggleSort("name")}
                  />
                </th>
                <th>
                  <SortButton
                    label="Email"
                    active={sort === "email"}
                    dir={sortDir}
                    onClick={() => toggleSort("email")}
                  />
                </th>
                <th>
                  <SortButton
                    label="Số tiền"
                    active={sort === "amount"}
                    dir={sortDir}
                    onClick={() => toggleSort("amount")}
                  />
                </th>
                <th>Món</th>
                <th>
                  <SortButton
                    label="Mail"
                    active={sort === "mailSent"}
                    dir={sortDir}
                    onClick={() => toggleSort("mailSent")}
                  />
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-empty">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const sent = Boolean(row.thankYouEmailSentAt);
                  return (
                    <tr key={row.id}>
                      <td>
                        {new Date(row.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td title={row.name}>{row.name}</td>
                      <td title={row.email}>{row.email}</td>
                      <td className="tabular-nums text-[var(--color-gold)]">
                        {formatVnd(row.amount)}
                      </td>
                      <td
                        className="text-[var(--color-muted-foreground)]"
                        title={itemsLabel(row.items)}
                      >
                        {itemsLabel(row.items)}
                      </td>
                      <td>
                        <span
                          className={
                            sent ? "admin-badge is-sent" : "admin-badge is-pending"
                          }
                        >
                          {sent ? "Đã gửi" : "Chưa gửi"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-action is-ghost"
                            onClick={() => setSelected(row)}
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            className="admin-action"
                            disabled={resendingId === row.id || loading}
                            onClick={() => void resendMail(row)}
                          >
                            {resendingId === row.id ? "Đang gửi…" : "Gửi lại"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pager">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {total} kết quả · trang {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-icon px-4"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Trước
            </button>
            <button
              type="button"
              className="btn-icon px-4"
              disabled={loading || page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Sau
            </button>
          </div>
        </div>
      </div>
      ) : null}

      {passwordOpen ? (
        <PasswordDialog onClose={() => setPasswordOpen(false)} />
      ) : null}

      {selected ? (
        <AdminDetailDialog
          donation={selected}
          onClose={() => setSelected(null)}
          resending={resendingId === selected.id}
          onResend={() => void resendMail(selected)}
        />
      ) : null}
    </div>
  );
}
