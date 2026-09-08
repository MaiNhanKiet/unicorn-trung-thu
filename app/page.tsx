import { Suspense } from "react";
import { LanternStreet } from "@/components/lantern-street";
import { HomeSkeleton } from "@/components/page-skeletons";

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <LanternStreet />
    </Suspense>
  );
}
