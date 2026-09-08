"use client";

import { LANTERN_ASSETS, PRODUCTS } from "@/lib/catalog";
import { cartTotal, formatVnd } from "@/lib/format";
import type { CartLine, ProductId } from "@/lib/types";
import { ArrowLeft, Minus, Plus } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useId, useMemo, useState } from "react";

const EMPTY: Record<ProductId, number> = {
  "nuoc-sam": 0,
  "banh-trang": 0,
  "com-chay": 0,
};

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DonateForm() {
  const router = useRouter();
  const [qty, setQty] = useState(EMPTY);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    name?: string;
    items?: string;
    submit?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const emailId = useId();
  const nameId = useId();
  const messageId = useId();
  const emailErrorId = useId();
  const nameErrorId = useId();
  const itemsErrorId = useId();

  const items = useMemo<CartLine[]>(
    () =>
      (Object.entries(qty) as [ProductId, number][])
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [qty],
  );
  const total = cartTotal(items);
  const canSubmit =
    items.length > 0 && email.trim().length > 0 && name.trim().length > 0;

  function changeQty(id: ProductId, delta: number) {
    setQty((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(20, current[id] + delta)),
    }));
    setErrors((current) =>
      current.items ? { ...current, items: undefined } : current,
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    const nextErrors: typeof errors = {};
    if (items.length === 0) {
      nextErrors.items = "Chọn ít nhất một món.";
    }
    if (!email.trim()) {
      nextErrors.email = "Nhập email.";
    } else if (!EMAIL_OK.test(email.trim())) {
      nextErrors.email = "Email không hợp lệ.";
    }
    if (!name.trim()) {
      nextErrors.name = "Nhập tên hiện trên lồng đèn.";
    }
    if (nextErrors.email || nextErrors.name || nextErrors.items) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim().slice(0, 40),
          message: message.trim(),
          items,
        }),
      });
      const data = (await response.json()) as {
        paymentId?: string;
        error?: string;
      };
      if (!response.ok || !data.paymentId) {
        setErrors({ submit: data.error ?? "Không tạo được mã QR. Thử lại." });
        return;
      }
      router.push(`/donate/pay?paymentId=${data.paymentId}`);
    } catch {
      setErrors({ submit: "Mất kết nối. Thử lại sau." });
    } finally {
      setSubmitting(false);
    }
  }

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
      <div className="relative z-10 mx-auto max-w-lg px-4 pb-[calc(8.75rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link href="/" className="soft-link">
          <ArrowLeft size={20} aria-hidden="true" />
          Về Đan Tiếng Yêu Thương
        </Link>
        <div className="glass mt-4 px-5 py-6">
          <p className="eyebrow">Đan Tiếng Yêu Thương</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Chọn món bạn muốn gửi</h1>
          <p className="mt-3 text-[var(--color-muted-foreground)]">
            Thanh toán VietQR qua PayOS. Sau khi chuyển khoản, lồng đèn sẽ được
            thắp trên phố.
          </p>
        </div>

        <form
          id="donate-form"
          className="mt-6 space-y-6"
          onSubmit={onSubmit}
          noValidate
        >
          <fieldset
            id="items"
            aria-describedby={errors.items ? itemsErrorId : undefined}
            aria-invalid={Boolean(errors.items)}
          >
            <legend className="text-xl font-semibold">
              Món bán gây quỹ <span className="req-star">*</span>
            </legend>
            <ul className="mt-3 space-y-3">
              {PRODUCTS.map((product, index) => {
                const lantern = Object.values(LANTERN_ASSETS)[index % 4];
                const quantity = qty[product.id];
                return (
                  <li
                    key={product.id}
                    className={`card flex items-center gap-3 ${quantity > 0 ? "is-selected" : ""}`}
                  >
                    <Image
                      src={lantern.src}
                      alt=""
                      width={56}
                      height={56}
                      className="pixel-sprite h-14 w-14 object-contain"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {product.blurb}
                      </p>
                      <p className="mt-1 font-semibold text-[var(--color-gold)]">
                        {formatVnd(product.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label={`Giảm số lượng ${product.name}`}
                        onClick={() => changeQty(product.id, -1)}
                        disabled={quantity === 0}
                      >
                        <Minus size={18} aria-hidden="true" />
                      </button>
                      <span className="qty text-lg" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label={`Tăng số lượng ${product.name}`}
                        onClick={() => changeQty(product.id, 1)}
                      >
                        <Plus size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {errors.items ? (
              <p
                id={itemsErrorId}
                className="mt-2 text-sm text-[var(--color-destructive)]"
                role="alert"
              >
                {errors.items}
              </p>
            ) : null}
          </fieldset>

          <div className="space-y-4">
            <div>
              <label htmlFor={emailId} className="label">
                Email <span className="req-star">*</span>
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                required
                className="field"
                value={email}
                placeholder="trungthu@gmail.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? emailErrorId : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((current) =>
                    current.email ? { ...current, email: undefined } : current,
                  );
                }}
              />
              {errors.email ? (
                <p
                  id={emailErrorId}
                  className="mt-1 text-sm text-[var(--color-destructive)]"
                  role="alert"
                >
                  {errors.email}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={nameId} className="label">
                Tên hiện trên lồng đèn <span className="req-star">*</span>
              </label>
              <input
                id={nameId}
                name="name"
                className="field"
                maxLength={40}
                required
                value={name}
                placeholder="Ví dụ: Minh Anh"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? nameErrorId : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((current) =>
                    current.name ? { ...current, name: undefined } : current,
                  );
                }}
              />
              {errors.name ? (
                <p
                  id={nameErrorId}
                  className="mt-1 text-sm text-[var(--color-destructive)]"
                  role="alert"
                >
                  {errors.name}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={messageId} className="label">
                Lời nhắn
              </label>
              <textarea
                id={messageId}
                name="message"
                className="field min-h-24"
                maxLength={140}
                value={message}
                placeholder="Gửi một lời chúc ngắn…"
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
          </div>
        </form>

        <div className="donate-checkout-bar">
          <div className="donate-checkout-bar__inner">
            <p className="mb-3 text-lg">
              Tổng cộng{" "}
              <span className="font-semibold text-[var(--color-gold)]">
                {formatVnd(total)}
              </span>
            </p>
            {errors.submit ? (
              <p
                className="mb-2 text-sm text-[var(--color-destructive)]"
                role="alert"
              >
                {errors.submit}
              </p>
            ) : null}
            <button
              type="submit"
              form="donate-form"
              className="btn-primary w-full justify-center"
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Đang tạo mã QR…" : "Tiếp tục thanh toán QR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
