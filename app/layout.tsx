import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { DonationProvider } from "@/components/donation-store";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Đan Tiếng Yêu Thương",
  description:
    "Gom điều nhỏ bé — Dệt ngàn yêu thương. Dự án cộng đồng Trung Thu kết hợp gây quỹ và hoạt động hướng đến cộng đồng.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14101a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <DonationProvider>{children}</DonationProvider>
      </body>
    </html>
  );
}
