"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Donation } from "@/lib/types";

const PAGE_SIZE = 24;

type DonationContextValue = {
  donations: Donation[];
  totalRaised: number;
  hasMore: boolean;
  loadingMore: boolean;
  ready: boolean;
  featuredId: string | null;
  refreshDonations: () => Promise<void>;
  loadMoreDonations: () => Promise<void>;
  setFeaturedId: (id: string | null) => void;
};

const DonationContext = createContext<DonationContextValue | null>(null);

export function DonationProvider({ children }: { children: React.ReactNode }) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const loadingMoreRef = useRef(false);
  const totalRef = useRef(0);

  const refreshDonations = useCallback(async () => {
    const response = await fetch(
      `/api/donations?limit=${PAGE_SIZE}&offset=0`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      donations?: Donation[];
      total?: number;
      hasMore?: boolean;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "Không tải được quyên góp.");
    }
    setDonations(data.donations ?? []);
    const total = data.total ?? 0;
    totalRef.current = total;
    setTotalRaised(total);
    setHasMore(Boolean(data.hasMore));
    setReady(true);
  }, []);

  const loadMoreDonations = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const offset = donations.length;
      const response = await fetch(
        `/api/donations?limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        donations?: Donation[];
        total?: number;
        hasMore?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Không tải thêm được.");
      }
      const next = data.donations ?? [];
      setDonations((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.filter((item) => !seen.has(item.id))];
      });
      if (typeof data.total === "number") {
        totalRef.current = data.total;
        setTotalRaised(data.total);
      }
      setHasMore(Boolean(data.hasMore));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [donations.length, hasMore]);

  useEffect(() => {
    void refreshDonations().catch((error) => {
      console.error(error);
      setReady(true);
    });
  }, [refreshDonations]);

  useEffect(() => {
    const source = new EventSource("/api/donations/events");

    source.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data) as {
          type?: string;
          total?: number;
          count?: number;
        };
        if (data.type !== "total" || typeof data.total !== "number") return;

        const previous = totalRef.current;
        totalRef.current = data.total;
        setTotalRaised(data.total);

        // Có quyên góp mới → làm mới trang đầu danh sách / phố đèn.
        if (data.total !== previous) {
          void refreshDonations().catch(() => {
            /* giữ total đã cập nhật */
          });
        }
      } catch {
        /* ignore */
      }
    };

    return () => {
      source.close();
    };
  }, [refreshDonations]);

  const value = useMemo(
    () => ({
      donations,
      totalRaised,
      hasMore,
      loadingMore,
      ready,
      featuredId,
      refreshDonations,
      loadMoreDonations,
      setFeaturedId,
    }),
    [
      donations,
      totalRaised,
      hasMore,
      loadingMore,
      ready,
      featuredId,
      refreshDonations,
      loadMoreDonations,
    ],
  );

  return (
    <DonationContext.Provider value={value}>{children}</DonationContext.Provider>
  );
}

export function useDonations() {
  const context = useContext(DonationContext);
  if (!context) {
    throw new Error("useDonations must be used within DonationProvider");
  }
  return context;
}
