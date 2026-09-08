"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  FUND_GOAL,
  LANTERN_ASSETS,
  VISIBLE_LANTERN_LIMIT,
  FEATURED_MS,
} from "@/lib/catalog";
import { formatVnd, isValidEmail, normalizeEmail } from "@/lib/format";
import type { Donation } from "@/lib/types";
import { AnimatedTotal } from "./animated-total";
import { DonorDialog } from "./donor-dialog";
import { LanternCarousel3D } from "./lantern-carousel-3d";
import { HomeSkeleton } from "./page-skeletons";
import { useDonations } from "./donation-store";

export function LanternStreet() {
  const {
    donations,
    totalRaised,
    featuredId,
    ready,
    hasMore,
    loadingMore,
    loadMoreDonations,
    setFeaturedId,
  } = useDonations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selected, setSelected] = useState<Donation | null>(null);
  const [viewTab, setViewTab] = useState<"sky" | "list">("sky");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [found, setFound] = useState<Donation[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
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
  const total = totalRaised;
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

  useEffect(() => {
    if (viewTab !== "list" || !hasMore) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreDonations();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewTab, hasMore, loadMoreDonations, sorted.length]);

  if (!ready) {
    return <HomeSkeleton />;
  }

  return (
    <div className="page-shell">
      <div
        className="page-backdrop transition-[filter] duration-700"
        style={{
          filter: `brightness(${0.78 + brightness * 0.32}) saturate(${0.9 + brightness * 0.25})`,
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

      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:max-w-6xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.85fr)] lg:items-stretch">
          <div className="glass px-5 py-6 sm:px-7 lg:px-8 lg:py-7">
            <p className="eyebrow">Dự án cộng đồng</p>
            <h1 className="mt-3 text-3xl text-[var(--color-gold)] sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              Đan Tiếng Yêu Thương
            </h1>
            <p className="mt-3 font-medium text-[var(--color-teal)]">
              Gom điều nhỏ bé — Dệt ngàn yêu thương
            </p>
            <p className="mt-4 max-w-prose text-[var(--color-muted-foreground)]">
              Trung Thu không chỉ là mùa của đoàn viên, mà còn là dịp để kết nối, sẻ chia
              và lan tỏa yêu thương.
            </p>
          </div>
          <header className="glass flex flex-col items-center justify-center px-5 py-5 text-center sm:px-7 lg:px-6">
            <p className="eyebrow">
              Tổng tiền hiện tại
            </p>
            <AnimatedTotal value={total} ready={ready} />
          </header>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-4 w-full max-w-5xl px-4 sm:px-6 lg:max-w-6xl">
        <form
          className="glass px-4 py-4 sm:px-5 lg:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            const email = normalizeEmail(lookupEmail);
            if (!isValidEmail(email)) {
              setLookupError("Email sai định dạng.");
              setFound([]);
              return;
            }
            void (async () => {
              try {
                const response = await fetch(
                  `/api/donations?email=${encodeURIComponent(email)}`,
                  { cache: "no-store" },
                );
                const data = (await response.json()) as {
                  donations?: Donation[];
                  error?: string;
                };
                if (!response.ok) {
                  setLookupError(data.error ?? "Không tìm được.");
                  setFound([]);
                  return;
                }
                const matches = data.donations ?? [];
                if (matches.length === 0) {
                  setLookupError("Không thấy lồng đèn với email này.");
                  setFound([]);
                  return;
                }
                setLookupError("");
                setFound(matches);
              } catch {
                setLookupError("Mất kết nối. Thử lại.");
                setFound([]);
              }
            })();
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

      <section className="relative z-10 mx-auto mt-4 w-full max-w-5xl px-4 pb-36 sm:px-6 lg:max-w-6xl lg:pb-40">
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
            {hasMore ? (
              <div ref={loadMoreRef} className="py-4 text-center text-sm text-[var(--color-muted-foreground)]">
                {loadingMore ? "Đang tải thêm…" : "Cuộn để xem thêm"}
              </div>
            ) : sorted.length > 0 ? (
              <p className="py-3 text-center text-sm text-[var(--color-muted-foreground)]">
                Đã hết danh sách
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="donate-bar">
        <div className="donate-bar__inner">
          <Link href="/donate" className="btn-primary donate-cta w-full justify-center">
            <Heart
              className="donate-cta__heart"
              size={20}
              weight="fill"
              aria-hidden="true"
            />
            Quyên Góp
          </Link>
        </div>
      </div>

      <DonorDialog donation={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
