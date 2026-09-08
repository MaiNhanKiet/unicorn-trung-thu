export type ProductId = "nuoc-sam" | "banh-trang" | "com-chay";

export type Product = {
  id: ProductId;
  name: string;
  price: number;
  blurb: string;
};

export type CartLine = {
  productId: ProductId;
  quantity: number;
};

export type LanternKind = "round" | "carp" | "pagoda" | "rabbit";

export type Donation = {
  id: string;
  email: string;
  name: string;
  message: string;
  amount: number;
  items: CartLine[];
  lantern: LanternKind;
  createdAt: number;
  paymentId: string;
};

export type PaymentStatus = "pending" | "paid" | "cancelled";

export type PaymentRecord = {
  id: string;
  orderCode: number;
  amount: number;
  description: string;
  status: PaymentStatus;
  /** VietQR EMV string from PayOS */
  qrPayload: string;
  checkoutUrl: string | null;
  payosLinkId: string | null;
  bin: string | null;
  accountNumber: string | null;
  /** Nội dung CK ngắn dùng cho VietQR addInfo */
  transferDescription: string | null;
  email: string;
  name: string;
  message: string;
  items: CartLine[];
  lantern: LanternKind;
  createdAt: number;
};

/** @deprecated Use PaymentRecord */
export type SimulatedPayment = PaymentRecord;
