import type { LanternKind, Product, ProductId } from "./types";

export const PRODUCTS: Product[] = [
  {
    id: "nuoc-sam",
    name: "Nước Sâm",
    price: 15_000,
    blurb: "Mát lạnh, gửi một ngụm ngọt vào phố đêm.",
  },
  {
    id: "banh-trang",
    name: "Bánh Tráng",
    price: 15_000,
    blurb: "Giòn rụm, thêm một ánh đèn trên phố.",
  },
  {
    id: "com-chay",
    name: "Cơm cháy",
    price: 20_000,
    blurb: "Nóng giòn, thắp sáng thêm một lồng đèn.",
  },
];

export const PRODUCT_MAP: Record<ProductId, Product> = Object.fromEntries(
  PRODUCTS.map((product) => [product.id, product]),
) as Record<ProductId, Product>;

export const LANTERN_ASSETS: Record<
  LanternKind,
  { src: string; alt: string; width: number; height: number }
> = {
  round: {
    src: "/image/lantern-round.png",
    alt: "Lồng đèn tròn đỏ",
    width: 1254,
    height: 1254,
  },
  carp: {
    src: "/image/lantern-carp.png",
    alt: "Lồng đèn cá chép",
    width: 1536,
    height: 1024,
  },
  pagoda: {
    src: "/image/lantern-pagoda.png",
    alt: "Lồng đèn lầu múa lân",
    width: 1145,
    height: 1374,
  },
  rabbit: {
    src: "/image/lantern-rabbit.png",
    alt: "Lồng đèn thỏ ngọc",
    width: 1254,
    height: 1254,
  },
};

export const LANTERN_KINDS: LanternKind[] = [
  "round",
  "carp",
  "pagoda",
  "rabbit",
];

export const FUND_GOAL = 2_000_000;
export const VISIBLE_LANTERN_LIMIT = 24;
export const FEATURED_MS = 4500;
