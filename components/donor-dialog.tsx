"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LANTERN_ASSETS, PRODUCT_MAP } from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import type { Donation } from "@/lib/types";
import { X } from "@phosphor-icons/react";

export function DonorDialog({
  donation,
  onClose,
}: {
  donation: Donation | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!donation) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    const previousOverflowX = document.documentElement.style.overflowX;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflowX = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflowX = previousOverflowX;
    };
  }, [donation, onClose]);

  if (!donation || !mounted) return null;

  const lantern = LANTERN_ASSETS[donation.lantern];

  return createPortal(
    <div className="donor-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="donor-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Lồng đèn</p>
            <h2 id={titleId} className="mt-2 break-words text-xl sm:text-2xl">
              {donation.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn-icon shrink-0"
            aria-label="Đóng thông tin lồng đèn"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex min-w-0 items-center gap-3">
          <Image
            src={lantern.src}
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 object-contain"
            unoptimized
          />
          <div className="min-w-0">
            <p className="break-words text-2xl font-semibold text-[var(--color-gold)]">
              {formatVnd(donation.amount)}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Tổng thanh toán
            </p>
          </div>
        </div>

        <dl className="donor-meta mt-4">
          <div>
            <dt>Tên</dt>
            <dd>{donation.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{donation.email}</dd>
          </div>
          <div>
            <dt>Món đã mua</dt>
            <dd>
              <ul className="mt-1 space-y-1">
                {donation.items.map((line) => {
                  const product = PRODUCT_MAP[line.productId];
                  return (
                    <li key={line.productId}>
                      {product.name} ×{line.quantity} —{" "}
                      {formatVnd(product.price * line.quantity)}
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-2xl bg-black/25 p-3">
          <p className="text-sm font-medium text-[var(--color-gold)]">Lời chúc</p>
          <p className="mt-2 break-words leading-relaxed">“{donation.message}”</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
