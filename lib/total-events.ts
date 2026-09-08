type TotalListener = (payload: { total: number; count: number }) => void;

const globalForBus = globalThis as typeof globalThis & {
  __totalBus?: Set<TotalListener>;
};

function bus() {
  if (!globalForBus.__totalBus) {
    globalForBus.__totalBus = new Set();
  }
  return globalForBus.__totalBus;
}

export function subscribeTotals(listener: TotalListener) {
  const set = bus();
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

export function publishTotals(payload: { total: number; count: number }) {
  for (const listener of bus()) {
    try {
      listener(payload);
    } catch (error) {
      console.error("[total-events]", error);
    }
  }
}

export async function publishCurrentTotals() {
  const { getDonationsTotals } = await import("@/lib/donations-repo");
  const totals = await getDonationsTotals();
  publishTotals(totals);
  return totals;
}
