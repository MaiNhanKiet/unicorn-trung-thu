const KEY = "trungthu.pendingPaymentId";

export function getPendingPaymentId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setPendingPaymentId(paymentId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, paymentId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPendingPaymentId() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Trả về paymentId nếu đơn vẫn pending; xóa storage nếu đã xong/hủy/không tồn tại. */
export async function resolvePendingPaymentId(): Promise<string | null> {
  const paymentId = getPendingPaymentId();
  if (!paymentId) return null;

  try {
    const response = await fetch(`/api/payments/${paymentId}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as {
      status?: string;
      error?: string;
    };
    if (!response.ok) {
      clearPendingPaymentId();
      return null;
    }
    if (data.status === "pending") return paymentId;
    clearPendingPaymentId();
    return null;
  } catch {
    return paymentId;
  }
}
