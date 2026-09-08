import { Suspense } from "react";
import { LanternStreet } from "@/components/lantern-street";

export default function Home() {
  return (
    <Suspense fallback={<p className="p-6">Đang mở phố lồng đèn…</p>}>
      <LanternStreet />
    </Suspense>
  );
}
