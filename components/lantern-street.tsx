"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  FUND_GOAL,
  LANTERN_ASSETS,
  VISIBLE_LANTERN_LIMIT,
  FEATURED_MS,
} from "@/lib/catalog";
import { formatVnd, isValidEmail, normalizeEmail } from "@/lib/format";
import type { Donation } from "@/lib/types";
import { DonorDialog } from "./donor-dialog";
import { LanternCarousel3D } from "./lantern-carousel-3d";
import { useDonations } from "./donation-store";

export function LanternStreet() {
  const { donations, featuredId, ready, setFeaturedId } = useDonations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selected, setSelected] = useState<Donation | null>(null);
  const [viewTab, setViewTab] = useState<"sky" | "list">("sky");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [found, setFound] = useState<Donation[]>([]);
  const lookupId = useId();
  const lookupErrorId = useId();
  const tabSkyId = useId();
  const tabListId = useId();
  const panelSkyId = useId();
  const panelListId = useId();
  const canSearch = lookupEmail.trim().length > 0;

  const sorted = useMemo(
    () => [...donations].sort((a, b) => b.createdAt - a.createdAt),
    [donations],
  );
  const hanging = sorted.slice(0, VISIBLE_LANTERN_LIMIT);
  const mineIds = useMemo(() => new Set(found.map((item) => item.id)), [found]);
  const total = sorted.reduce((sum, item) => sum + item.amount, 0);
  const brightness = Math.min(1, total / FUND_GOAL);
  const highlightId = featuredId ?? searchParams.get("highlight");
  const featured = hanging.find((item) => item.id === highlightId) ?? null;

  useEffect(() => {
    if (!featured) return;
    setViewTab("sky");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollTimer = window.setTimeout(() => {
      document.getElementById("lantern-sky")?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
      });
    }, 40);
    const clearTimer = window.setTimeout(
      () => {
        setFeaturedId(null);
        if (searchParams.get("highlight")) router.replace("/", { scroll: false });
      },
      reduce ? 2200 : FEATURED_MS,
    );
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [featured, router, searchParams, setFeaturedId]);

  useEffect(() => {
    if (found.length === 0) return;
    setViewTab("sky");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      document.getElementById("lantern-sky")?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
      });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [found]);

  return (
    <div className="page-shell">
      <div
        className="page-backdrop transition-[filter] duration-700"
        style={{
          filter: `brightness(${0.78 + brightness * 0.4}) saturate(${0.9 + brightness * 0.3})`,
        }}
      >
        <Image
          src="/image/street-night.png"
          alt=""
          fill
          preload
          sizes="100vw"
          className="pixel-sprite"
          loading="eager"
        />
        <div className="page-veil" />
      </div>

      <section className="relative z-10 mx-auto max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <div className="glass px-5 py-6 sm:px-7">
          <p className="eyebrow">Dự án cộng đồng</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Đan Tiếng Yêu Thương</h1>
          <p className="mt-3 font-medium text-[var(--color-gold)]">
            Gom điều nhỏ bé — Dệt ngàn yêu thương
          </p>
          <p className="mt-4 text-[var(--color-muted-foreground)]">
            Trung Thu không chỉ là mùa của đoàn viên, mà còn là dịp để kết nối, sẻ chia
            và lan tỏa yêu thương.
          </p>
        </div>
      </section>

      <header className="relative z-10 mx-auto mt-4 max-w-3xl px-4 sm:px-6">
        <div className="glass px-5 py-4 text-center sm:px-7">
          <p className="eyebrow" style={{ color: "#fff" }}>
            Tổng số tiền hiện tại
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--color-gold)] sm:text-4xl">
            {ready ? formatVnd(total) : "…"}
          </p>
        </div>
      </header>

      <section className="relative z-10 mx-auto mt-4 max-w-3xl px-4 sm:px-6">
        <form
          className="glass px-4 py-4 sm:px-5"
          onSubmit={(event) => {
            event.preventDefault();
            const email = normalizeEmail(lookupEmail);
            if (!isValidEmail(email)) {
              setLookupError("Email sai định dạng.");
              setFound([]);
              return;
            }
            const matches = sorted.filter(
              (item) => normalizeEmail(item.email) === email,
            );
            if (matches.length === 0) {
              setLookupError("Không thấy lồng đèn với email này.");
              setFound([]);
              return;
            }
            setLookupError("");
            setFound(matches);
          }}
        >
          <label htmlFor={lookupId} className="label find-label">
            Tìm lồng đèn của bạn
          </label>
          <div className="find-box">
            <input
              id={lookupId}
              type="email"
              name="lookup-email"
              autoComplete="email"
              value={lookupEmail}
              placeholder="Email lúc quyên góp"
              readOnly={found.length > 0}
              aria-invalid={Boolean(lookupError)}
              aria-describedby={lookupError ? lookupErrorId : undefined}
              onChange={(event) => {
                setLookupEmail(event.target.value);
                setLookupError("");
              }}
            />
            {found.length > 0 ? (
              <button
                type="button"
                className="find-go"
                aria-label="Xóa tìm kiếm, tìm lượt khác"
                onClick={() => {
                  setFound([]);
                  setLookupEmail("");
                  setLookupError("");
                }}
              >
                <X size={18} weight="bold" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                className="find-go"
                aria-label="Tìm lồng đèn"
                disabled={!canSearch}
              >
                <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
              </button>
            )}
          </div>
          {lookupError ? (
            <p id={lookupErrorId} className="mt-2 text-sm text-[var(--color-destructive)]">
              {lookupError}
            </p>
          ) : null}
        </form>
      </section>

      <section className="relative z-10 mx-auto mt-4 w-full max-w-5xl px-4 pb-36 sm:px-6">
        <div className="street-section">
          <div className="street-tabs" role="tablist" aria-label="Xem phố lồng đèn">
            <button
              type="button"
              role="tab"
              id={tabSkyId}
              aria-selected={viewTab === "sky"}
              aria-controls={panelSkyId}
              className={viewTab === "sky" ? "street-tab is-active" : "street-tab"}
              onClick={() => setViewTab("sky")}
            >
              Phố đèn
            </button>
            <button
              type="button"
              role="tab"
              id={tabListId}
              aria-selected={viewTab === "list"}
              aria-controls={panelListId}
              className={viewTab === "list" ? "street-tab is-active" : "street-tab"}
              onClick={() => setViewTab("list")}
            >
              Danh sách
            </button>
          </div>

          <div
            role="tabpanel"
            id={panelSkyId}
            aria-labelledby={tabSkyId}
            hidden={viewTab !== "sky"}
            className="street-panel"
          >
            <LanternCarousel3D
              lanterns={hanging}
              featured={featured}
              mineIds={mineIds}
              onSelect={setSelected}
            />
          </div>

          <div
            role="tabpanel"
            id={panelListId}
            aria-labelledby={tabListId}
            hidden={viewTab !== "list"}
            className="street-panel"
          >
            <ul className="street-list">
              {sorted.map((donation) => (
                <li key={donation.id} id={`lantern-row-${donation.id}`}>
                  <button
                    type="button"
                    className={
                      mineIds.has(donation.id)
                        ? "archive-row is-found cursor-pointer"
                        : "archive-row cursor-pointer"
                    }
                    onClick={() => setSelected(donation)}
                  >
                    <Image
                      src={LANTERN_ASSETS[donation.lantern].src}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                      unoptimized
                    />
                    <span className="min-w-0 flex-1 overflow-hidden text-left">
                      <span className="block truncate font-medium">{donation.name}</span>
                      <span className="archive-wish">{donation.message}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--color-gold)]">
                      {formatVnd(donation.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="donate-bar">
        <Link href="/donate" className="btn-primary w-full justify-center">
          <Heart size={20} weight="fill" aria-hidden="true" />
          Quyên góp — thắp một lồng đèn
        </Link>
      </div>

      <DonorDialog donation={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
