"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, QrCode } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { certificateCopy } from "@/lib/certificate";
import { formatVnd } from "@/lib/format";
import type { CartLine, LanternKind, PaymentStatus } from "@/lib/types";
import { useDonations } from "./donation-store";

type PaymentView = {
  paymentId: string;
  orderCode: number;
  amount: number;
  status: PaymentStatus;
  email: string;
  name: string;
  message: string;
  items: CartLine[];
  lantern: LanternKind;
  description: string;
  transferDescription: string | null;
  bin: string | null;
  accountNumber: string | null;
  qrImageUrl: string | null;
};

export function PaymentCheckout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("paymentId");
  const cancelled = searchParams.get("cancelled") === "1";
  const { refreshDonations, setFeaturedId } = useDonations();
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    let cancelledFetch = false;

    async function load(sync: boolean) {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: sync ? "POST" : "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as PaymentView & { error?: string };
      if (cancelledFetch) return;
      if (!response.ok) {
        setError(data.error ?? "Không tìm thấy giao dịch.");
        return;
      }
      setPayment(data);
      setError(null);
    }

    void load(true);
    const timer = window.setInterval(() => {
      void load(true);
    }, 3000);
    return () => {
      cancelledFetch = true;
      window.clearInterval(timer);
    };
  }, [paymentId]);

  useEffect(() => {
    if (!payment || payment.status !== "paid") return;
    let cancelledFinish = false;

    async function finish() {
      try {
        await refreshDonations();
        if (cancelledFinish) return;
        setFeaturedId(payment!.paymentId);
        router.replace(`/?highlight=${payment!.paymentId}`);
      } catch {
        if (!cancelledFinish) {
          setError("Thanh toán ok nhưng chưa tải được phố đèn.");
        }
      }
    }

    void finish();
    return () => {
      cancelledFinish = true;
    };
  }, [payment, refreshDonations, router, setFeaturedId]);

  if (!paymentId) {
    return (
      <p className="p-6">
        Thiếu mã thanh toán.{" "}
        <Link href="/donate" className="underline">
          Chọn món lại
        </Link>
        .
      </p>
    );
  }

  const qrSrc =
    payment?.qrImageUrl ??
    (paymentId ? `/api/payments/${paymentId}/qr` : null);

  return (
    <div className="page-shell">
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
      <div className="relative z-10 mx-auto max-w-md px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link href="/donate" className="soft-link">
          <ArrowLeft size={20} aria-hidden="true" />
          Chỉnh đơn
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <QrCode size={26} aria-hidden="true" />
          <h1 className="text-3xl">Quét VietQR</h1>
        </div>
        <p className="mt-3 text-[var(--color-muted-foreground)]">
          Quét mã bằng app ngân hàng. Không cần mở trang PayOS — hệ thống tự xác
          nhận khi nhận tiền.
        </p>

        {cancelled && payment?.status === "pending" ? (
          <p role="status" className="mt-4 text-[var(--color-gold)]">
            Đơn trước đó đã hủy. Bạn vẫn có thể quét QR bên dưới nếu link còn hiệu
            lực.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-[var(--color-destructive)]">
            {error}
          </p>
        ) : null}

        {payment ? (
          <div className="glass mt-6 px-5 py-6">
            <p className="eyebrow">Đơn #{payment.orderCode}</p>
            <p className="mt-3 text-4xl font-semibold text-[var(--color-gold)]">
              {formatVnd(payment.amount)}
            </p>
            <p className="mt-2 text-[var(--color-muted-foreground)]">
              {payment.description}
            </p>
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
                  src={qrSrc ?? undefined}
                  alt={`Mã VietQR ${formatVnd(payment.amount)}`}
                  width={280}
                  height={280}
                  className="mx-auto mt-5 rounded-2xl bg-[#fff8ed] p-3"
                />
                <p className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
                  Đang chờ thanh toán…
                </p>
              </>
            ) : payment.status === "paid" ? (
              <p className="mt-5 text-center font-medium text-[var(--color-gold)]">
                Đã nhận tiền — đang thắp lồng đèn…
              </p>
            ) : (
              <p className="mt-5 text-center text-[var(--color-destructive)]">
                Đơn đã hủy hoặc hết hạn.{" "}
                <Link href="/donate" className="underline">
                  Tạo đơn mới
                </Link>
              </p>
            )}
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              {certificateCopy(payment.email)}
            </p>
          </div>
        ) : (
          <p className="mt-8" aria-live="polite">
            Đang lấy mã QR…
          </p>
        )}
      </div>
    </div>
  );
}
