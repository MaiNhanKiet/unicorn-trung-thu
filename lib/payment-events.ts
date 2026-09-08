import type { PaymentStatus } from "@/lib/types";

export type PaymentStreamEvent = {
  type: "status" | "ping";
  status?: PaymentStatus;
  paymentId?: string;
};

type Listener = (event: PaymentStreamEvent) => void;

const globalForBus = globalThis as typeof globalThis & {
  __paymentStatusBus?: Map<string, Set<Listener>>;
};

function bus() {
  if (!globalForBus.__paymentStatusBus) {
    globalForBus.__paymentStatusBus = new Map();
  }
  return globalForBus.__paymentStatusBus;
}

export function subscribePaymentStatus(paymentId: string, listener: Listener) {
  const map = bus();
  let set = map.get(paymentId);
  if (!set) {
    set = new Set();
    map.set(paymentId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) map.delete(paymentId);
  };
}

export function publishPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
) {
  const listeners = bus().get(paymentId);
  if (!listeners) return;
  const event: PaymentStreamEvent = {
    type: "status",
    status,
    paymentId,
  };
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("[payment-events]", error);
    }
  }
}
