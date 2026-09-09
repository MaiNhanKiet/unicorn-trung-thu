"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  DownloadSimple,
  QrCode,
  ShareNetwork,
} from "@phosphor-icons/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { formatVnd } from "@/lib/format";
import {
  clearPendingPaymentId,
  resolvePendingPaymentId,
  setPendingPaymentId,
} from "@/lib/pending-payment";
import type { PaymentStatus } from "@/lib/types";
import { PageLoading } from "./page-loading";
import { useDonations } from "./donation-store";

type PaymentView = {
  paymentId: string;
  orderCode: number;
  amount: number;
  status: PaymentStatus;
  description?: string;
  transferDescription?: string | null;
  email?: string;
  qrImageUrl: string | null;
};

async function cancelPaymentOnServer(paymentId: string) {
  const response = await fetch(`/api/payments/${paymentId}/cancel`, {
    method: "POST",
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Không hủy được đơn PayOS.");
  }
}

function applyPaymentPayload(
  data: PaymentView,
  current: PaymentView | null,
): PaymentView {
  return {
    paymentId: data.paymentId,
    orderCode: data.orderCode ?? current?.orderCode ?? 0,
    amount: data.amount ?? current?.amount ?? 0,
    status: data.status,
    description: data.description ?? current?.description,
    transferDescription:
      data.transferDescription ?? current?.transferDescription ?? null,
    email: data.email ?? current?.email,
    qrImageUrl: data.qrImageUrl ?? current?.qrImageUrl ?? null,
  };
}

export function PaymentCheckout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentIdParam = searchParams.get("paymentId");
  const { refreshDonations } = useDonations();
  const [paymentId, setPaymentId] = useState<string | null>(paymentIdParam);
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(Boolean(paymentIdParam));
  const [cancelling, setCancelling] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [sseNonce, setSseNonce] = useState(0);
  const [shareSupported, setShareSupported] = useState(false);
  const syncingRef = useRef(false);
  const paymentStatusRef = useRef<PaymentStatus | null>(null);

  useEffect(() => {
    paymentStatusRef.current = payment?.status ?? null;
  }, [payment?.status]);

  useEffect(() => {
    setShareSupported(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (paymentIdParam) {
      setPendingPaymentId(paymentIdParam);
      setPaymentId(paymentIdParam);
      setReady(true);
      return;
    }

    let cancelledResolve = false;
    void (async () => {
      const pendingId = await resolvePendingPaymentId();
      if (cancelledResolve) return;
      if (pendingId) {
        setPaymentId(pendingId);
        router.replace(`/donate/pay?paymentId=${pendingId}`);
      } else {
        setReady(true);
      }
    })();
    return () => {
      cancelledResolve = true;
    };
  }, [paymentIdParam, router]);

  const syncFromPayOS = useEffectEvent(async (reason: string) => {
    if (!paymentId || syncingRef.current) return;
    if (paymentStatusRef.current && paymentStatusRef.current !== "pending") {
      return;
    }
    syncingRef.current = true;
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: "POST",
        cache: "no-store",
      });
      const data = (await response.json()) as PaymentView & { error?: string };
      if (!response.ok) {
        if (reason === "mount") {
          setError(data.error ?? "Không đồng bộ được giao dịch.");
        }
        return;
      }
      setPayment((current) => applyPaymentPayload(data, current));
      setError(null);
      if (data.status === "pending") setPendingPaymentId(data.paymentId);
      else clearPendingPaymentId();
    } catch {
      if (reason === "mount") {
        setError("Mất kết nối khi kiểm tra thanh toán.");
      }
    } finally {
      syncingRef.current = false;
    }
  });

  useEffect(() => {
    if (!paymentId) return;

    let cancelled = false;
    void (async () => {
      // POST đồng bộ PayOS ngay (webhook có thể đã tới hoặc user vừa CK xong).
      await syncFromPayOS("mount");
      if (cancelled) return;
      // Fallback GET nếu POST lỗi mạng nhưng DB đã paid.
      if (!paymentStatusRef.current) {
        try {
          const response = await fetch(`/api/payments/${paymentId}`, {
            cache: "no-store",
          });
          const data = (await response.json()) as PaymentView & {
            error?: string;
          };
          if (cancelled) return;
          if (!response.ok) {
            clearPendingPaymentId();
            setError(data.error ?? "Không tìm thấy giao dịch.");
            return;
          }
          setPayment((current) => applyPaymentPayload(data, current));
          if (data.status === "pending") setPendingPaymentId(data.paymentId);
          else clearPendingPaymentId();
        } catch {
          /* syncFromPayOS đã báo lỗi nếu cần */
        }
      }
    })();

    const source = new EventSource(`/api/payments/${paymentId}/events`);

    source.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data) as PaymentView & {
          type?: string;
        };
        if (data.type === "ping") return;
        if (!data.paymentId || !data.status) return;

        setPayment((current) => applyPaymentPayload(data, current));

        if (data.status === "pending") {
          setPendingPaymentId(data.paymentId);
        } else {
          clearPendingPaymentId();
        }
      } catch {
        /* ignore malformed */
      }
    };

    source.onerror = () => {
      // iOS thường cắt SSE khi mở app ngân hàng — sẽ sync lại khi tab hiện.
      source.close();
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, [paymentId, sseNonce]);

  useEffect(() => {
    if (!paymentId) return;

    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResume = () => {
      if (document.visibilityState === "hidden") return;
      if (paymentStatusRef.current && paymentStatusRef.current !== "pending") {
        return;
      }
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        void syncFromPayOS("resume");
        setSseNonce((value) => value + 1);
      }, 400);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted || document.visibilityState === "visible") {
        onResume();
      }
    };

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [paymentId]);

  useEffect(() => {
    if (!payment || payment.status !== "paid") return;
    clearPendingPaymentId();
    let cancelled = false;
    void (async () => {
      try {
        await refreshDonations();
      } catch {
        /* vẫn chuyển màn success */
      }
      if (!cancelled) {
        router.replace(`/donate/success?paymentId=${payment.paymentId}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payment, refreshDonations, router]);

  async function cancelAndEdit() {
    if (!paymentId || cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      if (payment?.status === "pending") {
        await cancelPaymentOnServer(paymentId);
      }
      clearPendingPaymentId();
      router.push("/donate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không hủy được đơn.");
      setCancelling(false);
    }
  }

  async function saveQr() {
    if (!paymentId || !payment || downloadingQr) return;
    setDownloadingQr(true);
    setError(null);
    try {
      const response = await fetch(`/api/payments/${paymentId}/qr`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Không tải được mã QR.");
      }
      const blob = await response.blob();
      const mime = blob.type.includes("png")
        ? "image/png"
        : blob.type.includes("jpeg") || blob.type.includes("jpg")
          ? "image/jpeg"
          : blob.type || "image/png";
      const ext = mime.includes("png") ? "png" : "jpg";
      const fileName = `vietqr-don-${payment.orderCode}.${ext}`;
      const file = new File([blob], fileName, { type: mime });

      // iPhone/iPad: Share sheet → "Lưu ảnh" vào Thư viện Ảnh.
      const canShareFiles =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        try {
          await navigator.share({
            files: [file],
            title: "VietQR quyên góp",
            text: `Đơn #${payment.orderCode} · ${formatVnd(payment.amount)}`,
          });
          return;
        } catch (shareError) {
          if (
            shareError instanceof DOMException &&
            shareError.name === "AbortError"
          ) {
            return;
          }
        }
      }

      // Desktop / trình duyệt không hỗ trợ share file: tải xuống như cũ.
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được mã QR.");
    } finally {
      setDownloadingQr(false);
    }
  }

  if (!ready) {
    return (
      <div className="page-shell min-h-dvh">
        <div className="page-backdrop">
          <Image
            src="/image/street-night.png"
            alt=""
            fill
            sizes="100vw"
            className="pixel-sprite opacity-50"
            priority
          />
          <div className="page-veil" />
        </div>
        <PageLoading label="Đang mở mã QR…" />
      </div>
    );
  }

  if (!paymentId) {
    return (
      <p className="p-8 text-center">
        Không có giao dịch đang chờ.{" "}
        <Link href="/donate" className="underline">
          Quay lại form
        </Link>
      </p>
    );
  }

  const qrSrc = payment?.qrImageUrl ?? `/api/payments/${paymentId}/qr`;

  return (
    <div className="page-shell min-h-dvh">
      <div className="page-backdrop">
        <Image
          src="/image/street-night.png"
          alt=""
          fill
          sizes="100vw"
          className="pixel-sprite opacity-50"
        />
        <div className="page-veil" />
      </div>
      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md lg:max-w-lg">
          {payment?.status === "pending" ? (
            <button
              type="button"
              className="soft-link"
              onClick={cancelAndEdit}
              disabled={cancelling}
            >
              <ArrowLeft size={20} aria-hidden="true" />
              {cancelling ? "Đang hủy…" : "Quay lại chỉnh đơn"}
            </button>
          ) : null}

          <div className="mt-4 flex items-center justify-center gap-3">
            <QrCode size={26} aria-hidden="true" />
            <h1 className="text-3xl">Quét VietQR</h1>
          </div>
          <p className="mt-3 text-center text-[var(--color-muted-foreground)]">
            Quét mã bằng app ngân hàng. Hệ thống sẽ tự xác nhận khi nhận tiền.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-4 text-center text-[var(--color-destructive)]"
            >
              {error}
            </p>
          ) : null}

          {payment ? (
            <div className="glass mt-6 px-5 py-6 text-center">
              <p className="eyebrow">Đơn #{payment.orderCode}</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-gold)]">
                {formatVnd(payment.amount)}
              </p>
              {payment.description ? (
                <p className="mt-2 text-[var(--color-muted-foreground)]">
                  {payment.description}
                </p>
              ) : null}
              {payment.transferDescription ? (
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Nội dung CK:{" "}
                  <span className="font-medium text-white">
                    {payment.transferDescription}
                  </span>
                </p>
              ) : null}

              {payment.status === "pending" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt={`VietQR ${formatVnd(payment.amount)}`}
                    width={280}
                    height={280}
                    className="mx-auto mt-5 rounded-2xl bg-[#fff8ed] p-3"
                  />
                  <button
                    type="button"
                    className="btn-icon mx-auto mt-4 gap-2 px-5"
                    onClick={() => void saveQr()}
                    disabled={downloadingQr}
                  >
                    {shareSupported ? (
                      <ShareNetwork size={18} weight="bold" aria-hidden="true" />
                    ) : (
                      <DownloadSimple
                        size={18}
                        weight="bold"
                        aria-hidden="true"
                      />
                    )}
                    {downloadingQr
                      ? "Đang xử lý…"
                      : shareSupported
                        ? "Lưu / chia sẻ QR"
                        : "Tải mã QR"}
                  </button>
                  {shareSupported ? (
                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                      Trên iPhone chọn <strong>Lưu ảnh</strong> trong menu chia
                      sẻ để vào Thư viện Ảnh.
                    </p>
                  ) : null}
                  <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                    Đang chờ thanh toán…
                  </p>
                  <button
                    type="button"
                    className="mt-5 w-full rounded-full border border-[var(--color-destructive)] bg-[var(--color-destructive)]/15 px-5 py-3 font-semibold text-[var(--color-destructive)]"
                    onClick={cancelAndEdit}
                    disabled={cancelling}
                  >
                    {cancelling ? "Đang hủy…" : "Hủy đơn"}
                  </button>
                </>
              ) : payment.status === "paid" ? (
                <p className="mt-5 font-medium text-[var(--color-gold)]">
                  Đã nhận tiền — đang mở đơn…
                </p>
              ) : (
                <button
                  type="button"
                  className="btn-primary mt-5 w-full justify-center"
                  onClick={() => {
                    clearPendingPaymentId();
                    router.push("/donate");
                  }}
                >
                  Tạo đơn mới
                </button>
              )}
            </div>
          ) : (
            <p className="mt-8 text-center">Đang lấy mã QR…</p>
          )}
        </div>
      </div>
    </div>
  );
}
