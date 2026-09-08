"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react";
import { Suspense, useEffect, useState } from "react";
import { PRODUCT_MAP } from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import { clearPendingPaymentId } from "@/lib/pending-payment";
import type { CartLine, PaymentStatus } from "@/lib/types";
import { PageLoading } from "./page-loading";
import { SuccessSkeleton } from "./page-skeletons";
import { useDonations } from "./donation-store";

type PaidOrder = {
  paymentId: string;
  donationId?: string | null;
  orderCode: number;
  amount: number;
  status: PaymentStatus;
  name: string;
  email: string;
  message: string;
  items: CartLine[];
};

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("paymentId");
  const { refreshDonations, setFeaturedId } = useDonations();
  const [order, setOrder] = useState<PaidOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;

    void (async () => {
      const response = await fetch(`/api/payments/${paymentId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as PaidOrder & { error?: string };
      if (cancelled) return;
      if (!response.ok) {
        setError(data.error ?? "Không tìm thấy đơn.");
        return;
      }
      if (data.status !== "paid") {
        router.replace(`/donate/pay?paymentId=${paymentId}`);
        return;
      }
      clearPendingPaymentId();
      setOrder(data);
      void refreshDonations().catch(() => {
        /* vẫn hiện đơn success */
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentId, router, refreshDonations]);

  async function confirmHandover() {
    if (!order || confirming) return;
    setConfirming(true);
    try {
      await refreshDonations();
      const highlightId = order.donationId || order.paymentId;
      setFeaturedId(highlightId);
      router.replace(`/?highlight=${highlightId}`);
    } catch {
      setError("Đã nhận đơn nhưng chưa mở được phố đèn.");
      setConfirming(false);
    }
  }

  if (!paymentId) {
    return (
      <p className="p-6">
        <Link href="/" className="underline">
          Về trang chủ
        </Link>
      </p>
    );
  }

  if (!order && !error) {
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
        <PageLoading label="Đang xác nhận thanh toán…" />
      </div>
    );
  }

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
          {error ? (
            <p
              role="alert"
              className="mb-4 text-center text-[var(--color-destructive)]"
            >
              {error}
            </p>
          ) : null}

          {order ? (
            <div className="glass px-5 py-6">
              <div className="flex items-center justify-center gap-3 text-[var(--color-gold)]">
                <CheckCircle size={28} weight="fill" aria-hidden="true" />
                <h1 className="text-2xl font-semibold">Thanh toán thành công</h1>
              </div>
              <p className="mt-2 text-center text-[var(--color-muted-foreground)]">
                Vui lòng giữ màn hình này để nhận các món bạn đã mua
              </p>

              <p className="eyebrow mt-6 text-center">Đơn #{order.orderCode}</p>
              <p className="mt-2 text-center text-3xl font-semibold text-[var(--color-gold)]">
                {formatVnd(order.amount)}
              </p>

              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--color-muted-foreground)]">Tên</dt>
                  <dd className="mt-0.5 text-base font-medium">{order.name}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted-foreground)]">Email</dt>
                  <dd className="mt-0.5 break-all">{order.email}</dd>
                </div>
                {order.message ? (
                  <div>
                    <dt className="text-[var(--color-muted-foreground)]">
                      Lời nhắn
                    </dt>
                    <dd className="mt-0.5">{order.message}</dd>
                  </div>
                ) : null}
              </dl>

              <h2 className="mt-6 text-lg font-semibold">Món đã thanh toán</h2>
              <ul className="mt-3 space-y-2">
                {order.items.map((line) => {
                  const product = PRODUCT_MAP[line.productId];
                  const lineTotal = product.price * line.quantity;
                  return (
                    <li
                      key={line.productId}
                      className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] py-2"
                    >
                      <span>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-[var(--color-muted-foreground)]">
                          {" "}
                          × {line.quantity}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--color-gold)]">
                        {formatVnd(lineTotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                className="btn-primary mt-8 w-full justify-center"
                onClick={confirmHandover}
                disabled={confirming}
              >
                {confirming ? "Đang mở…" : "Về trang chủ"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PaymentSuccess() {
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
