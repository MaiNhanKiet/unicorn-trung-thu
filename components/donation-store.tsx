"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Donation } from "@/lib/types";

type DonationContextValue = {
  donations: Donation[];
  featuredId: string | null;
  ready: boolean;
  refreshDonations: () => Promise<void>;
  setFeaturedId: (id: string | null) => void;
};

const DonationContext = createContext<DonationContextValue | null>(null);

export function DonationProvider({ children }: { children: React.ReactNode }) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refreshDonations = useCallback(async () => {
    const response = await fetch("/api/donations", { cache: "no-store" });
    const data = (await response.json()) as {
      donations?: Donation[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "Không tải được quyên góp.");
    }
    setDonations(data.donations ?? []);
    setReady(true);
  }, []);

  useEffect(() => {
    void refreshDonations().catch((error) => {
      console.error(error);
      setReady(true);
    });
  }, [refreshDonations]);

  const value = useMemo(
    () => ({
      donations,
      featuredId,
      ready,
      refreshDonations,
      setFeaturedId,
    }),
    [donations, featuredId, ready, refreshDonations],
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
