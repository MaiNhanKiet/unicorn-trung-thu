import { Suspense } from "react";
import { PaymentCheckout } from "@/components/payment-checkout";

export default function PayPage() {
  return (
    <Suspense fallback={<p className="p-6">Đang mở cổng thanh toán…</p>}>
      <PaymentCheckout />
    </Suspense>
  );
}
