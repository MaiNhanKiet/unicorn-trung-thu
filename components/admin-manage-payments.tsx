"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useEffectEvent, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { LANTERN_KINDS, PRODUCTS } from "@/lib/catalog";
import type { PaymentStatusFilter } from "@/lib/admin-types";
import type { CartLine, LanternKind, PaymentStatus, ProductId } from "@/lib/types";
import { formatVnd } from "@/lib/format";

type PaymentRow = {
  id: string;
  orderCode: number;
  amount: number;
  description: string;
  status: PaymentStatus;
  email: string;
  name: string;
  message: string;
  items: CartLine[];
  lantern: string;
  createdAt: number;
  thankYouEmailSentAt: number | null;
  checkoutUrl: string | null;
};

const PAGE_SIZES = [10, 20, 50, 100] as const;

const LANTERN_LABEL: Record<string, string> = {
  round: "Tròn",
  carp: "Cá chép",
  pagoda: "Lầu",
  rabbit: "Thỏ",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Chờ",
  paid: "Đã trả",
  cancelled: "Đã hủy",
};

function quantityMap(items: CartLine[]) {
  const map = new Map<ProductId, number>();
  for (const line of items) {
    map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity);
  }
  return map;
}

function statusBadgeClass(status: PaymentStatus) {
  if (status === "paid") return "admin-badge is-sent";
  if (status === "pending") return "admin-badge is-pending";
  return "admin-badge is-processing";
}

function PaymentEditDialog({
  payment,
  onClose,
  onSaved,
}: {
  payment: PaymentRow;
  onClose: () => void;
  onSaved: (row: PaymentRow) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(payment.name);
  const [email, setEmail] = useState(payment.email);
  const [message, setMessage] = useState(payment.message);
  const [description, setDescription] = useState(payment.description);
  const [amount, setAmount] = useState(String(payment.amount));
  const [lantern, setLantern] = useState<LanternKind>(
    (LANTERN_KINDS.includes(payment.lantern as LanternKind)
      ? payment.lantern
      : "round") as LanternKind,
  );
  const [quantities, setQuantities] = useState(() => {
    const map = quantityMap(payment.items);
    return Object.fromEntries(
      PRODUCTS.map((product) => [product.id, map.get(product.id) ?? 0]),
    ) as Record<ProductId, number>;
  });
  const [error, setError] = useState("");
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
            <p className="eyebrow">Supabase · payments</p>
            <h2
              id={titleId}
              className="mt-2 text-xl text-[var(--color-gold)] sm:text-2xl"
            >
              Sửa payment #{payment.orderCode}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)] break-all">
              id: {payment.id}
            </p>
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
            const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
              setError("Số tiền không hợp lệ.");
              return;
            }
            setSaving(true);
            void (async () => {
              try {
                const items: CartLine[] = PRODUCTS.map((product) => ({
                  productId: product.id,
                  quantity: Math.max(0, Math.floor(quantities[product.id] || 0)),
                })).filter((line) => line.quantity > 0);

                const response = await fetch(
                  `/api/admin/payments/${encodeURIComponent(payment.id)}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "update",
                      name,
                      email,
                      message,
                      description,
                      amount: parsedAmount,
                      lantern,
                      items,
                    }),
                  },
                );
                const data = (await response.json()) as {
                  error?: string;
                  payment?: PaymentRow;
                };
                if (!response.ok || !data.payment) {
                  setError(data.error ?? "Không lưu được.");
                  return;
                }
                onSaved(data.payment);
                onClose();
              } catch {
                setError("Mất kết nối. Thử lại.");
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          <label className="label" htmlFor="pay-name">
            Tên
          </label>
          <input
            id="pay-name"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label className="label mt-1" htmlFor="pay-email">
            Email
          </label>
          <input
            id="pay-email"
            className="field"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="label mt-1" htmlFor="pay-amount">
            Số tiền (VND)
          </label>
          <input
            id="pay-amount"
            className="field"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          <label className="label mt-1" htmlFor="pay-desc">
            Mô tả
          </label>
          <input
            id="pay-desc"
            className="field"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <label className="label mt-1" htmlFor="pay-lantern">
            Lồng đèn
          </label>
          <select
            id="pay-lantern"
            className="field"
            value={lantern}
            onChange={(event) => setLantern(event.target.value as LanternKind)}
          >
            {LANTERN_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {LANTERN_LABEL[kind] ?? kind}
              </option>
            ))}
          </select>

          <p className="label mt-1">Món</p>
          <div className="admin-manage-items">
            {PRODUCTS.map((product) => (
              <label key={product.id} className="admin-manage-item">
                <span>{product.name}</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  step={1}
                  value={quantities[product.id]}
                  onChange={(event) =>
                    setQuantities((current) => ({
                      ...current,
                      [product.id]: Math.max(
                        0,
                        Math.floor(Number(event.target.value) || 0),
                      ),
                    }))
                  }
                />
              </label>
            ))}
          </div>

          <label className="label mt-1" htmlFor="pay-message">
            Lời nhắn
          </label>
          <textarea
            id="pay-message"
            className="field min-h-24"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />

          {error ? <p className="admin-error px-0">{error}</p> : null}

          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" className="admin-action" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
            <button type="button" className="btn-icon px-4" onClick={onClose}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function AdminManagePaymentsPanel({ active }: { active: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatusFilter>("all");
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const load = useEffectEvent(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        status,
      });
      const response = await fetch(`/api/admin/payments?${params}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        payments?: PaymentRow[];
        total?: number;
        totalPages?: number;
      };
      if (!response.ok) {
        setError(data.error ?? "Không tải được payments.");
        return;
      }
      setRows(data.payments ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError("Mất kết nối. Thử lại.");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, page, pageSize, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setPage(1);
        setSearch(searchInput.trim());
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, startTransition]);

  async function runAction(
    row: PaymentRow,
    action: "cancel" | "markPaid" | "clearMail",
  ) {
    setBusyId(row.id);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/payments/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        payment?: PaymentRow;
      };
      if (!response.ok || !data.payment) {
        setError(data.error ?? "Thao tác thất bại.");
        return;
      }
      setRows((current) =>
        current.map((item) => (item.id === row.id ? data.payment! : item)),
      );
    } catch {
      setError("Mất kết nối khi cập nhật payment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="glass admin-panel">
      <div className="admin-toolbar admin-manage-toolbar">
        <input
          className="field admin-search"
          type="search"
          placeholder="Tìm tên, email, order code, id…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <label className="admin-control">
          <span>Trạng thái</span>
          <select
            className="field"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as PaymentStatusFilter);
              setPage(1);
            }}
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ</option>
            <option value="paid">Đã trả</option>
            <option value="cancelled">Đã hủy</option>
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
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-loading" role="status" aria-live="polite">
            Đang tải payments…
          </div>
        ) : null}
        {error ? <p className="admin-error">{error}</p> : null}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Tên</th>
              <th>Email</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Mail</th>
              <th>Thời gian</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="admin-empty">
                  Không có payment.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const busy = busyId === row.id;
                return (
                  <tr key={row.id}>
                    <td className="tabular-nums">#{row.orderCode}</td>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td className="tabular-nums">{formatVnd(row.amount)}</td>
                    <td>
                      <span className={statusBadgeClass(row.status)}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td>
                      {row.status === "paid" ? (
                        <span
                          className={
                            row.thankYouEmailSentAt
                              ? "admin-badge is-sent"
                              : "admin-badge is-pending"
                          }
                        >
                          {row.thankYouEmailSentAt ? "Đã gửi" : "Chưa gửi"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {new Date(row.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-action is-ghost"
                          onClick={() => setEditing(row)}
                        >
                          Sửa
                        </button>
                        {row.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              className="admin-action"
                              disabled={busy}
                              onClick={() => void runAction(row, "markPaid")}
                            >
                              {busy ? "…" : "Đánh dấu paid"}
                            </button>
                            <button
                              type="button"
                              className="admin-action is-ghost"
                              disabled={busy}
                              onClick={() => void runAction(row, "cancel")}
                            >
                              Hủy
                            </button>
                          </>
                        ) : null}
                        {row.status === "paid" && row.thankYouEmailSentAt ? (
                          <button
                            type="button"
                            className="admin-action is-ghost"
                            disabled={busy}
                            onClick={() => void runAction(row, "clearMail")}
                          >
                            Reset cờ mail
                          </button>
                        ) : null}
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
          {total} payment · trang {page}/{totalPages}
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

      {editing ? (
        <PaymentEditDialog
          payment={editing}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            setRows((current) =>
              current.map((item) => (item.id === row.id ? row : item)),
            );
          }}
        />
      ) : null}
    </div>
  );
}
