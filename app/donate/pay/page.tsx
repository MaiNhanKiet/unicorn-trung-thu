import { Suspense } from "react";
import { PaymentCheckout } from "@/components/payment-checkout";
import { PaySkeleton } from "@/components/page-skeletons";

export default function PayPage() {
  return (
    <Suspense fallback={<PaySkeleton />}>
      <PaymentCheckout />
    </Suspense>
  );
}
