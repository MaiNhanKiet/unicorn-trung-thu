import type { CartLine, ProductId } from "@/lib/types";

export type AdminDonationRow = {
  id: string;
  paymentId: string;
  email: string;
  name: string;
  message: string;
  amount: number;
  items: CartLine[];
  lantern: string;
  createdAt: number;
  thankYouEmailSentAt: number | null;
};

export type AdminSortKey =
  | "createdAt"
  | "amount"
  | "name"
  | "email"
  | "mailSent";

export type MailFilter = "all" | "sent" | "pending";

export type ProductSoldStat = {
  productId: ProductId | string;
  name: string;
  quantity: number;
};
