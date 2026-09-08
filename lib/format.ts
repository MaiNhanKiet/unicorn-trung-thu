import { PRODUCT_MAP } from "./catalog";
import type { CartLine } from "./types";

export function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export function cartTotal(items: CartLine[]) {
  return items.reduce((sum, line) => {
    const product = PRODUCT_MAP[line.productId];
    return sum + product.price * line.quantity;
  }, 0);
}

export function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Bạn";
  return local.replace(/[._-]+/g, " ").trim() || "Bạn";
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function lanternKindFromSeed(seed: string) {
  const kinds = ["round", "carp", "pagoda", "rabbit"] as const;
  let hash = 0;
  for (const char of seed) hash = (hash + char.charCodeAt(0) * 17) % 997;
  return kinds[hash % kinds.length];
}
