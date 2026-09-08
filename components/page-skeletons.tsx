import type { ReactNode } from "react";

function Bone({ className = "" }: { className?: string }) {
  return <div className={`skel-bone ${className}`.trim()} aria-hidden="true" />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell min-h-dvh">
      <div className="page-backdrop page-backdrop--skel" aria-hidden="true" />
      <div className="page-veil" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <Shell>
      <div className="skel-home" aria-busy="true" aria-label="Đang tải trang chủ">
        <div className="skel-home__hero">
          <div className="glass skel-card">
            <Bone className="h-3 w-28" />
            <Bone className="mt-4 h-9 w-4/5 max-w-md" />
            <Bone className="mt-3 h-4 w-2/3 max-w-sm" />
            <Bone className="mt-4 h-16 w-full max-w-lg" />
          </div>
          <div className="glass skel-card skel-card--center">
            <Bone className="h-3 w-24" />
            <Bone className="mt-4 h-10 w-40" />
          </div>
        </div>
        <div className="glass skel-card mt-4">
          <Bone className="h-4 w-40" />
          <Bone className="mt-3 h-12 w-full" />
        </div>
        <div className="glass skel-card mt-4">
          <div className="flex gap-2">
            <Bone className="h-11 flex-1" />
            <Bone className="h-11 flex-1" />
          </div>
          <Bone className="mt-4 h-64 w-full sm:h-80" />
        </div>
        <Bone className="skel-donate-cta mt-8 h-14 w-56 mx-auto" />
      </div>
    </Shell>
  );
}

export function DonateSkeleton() {
  return (
    <Shell>
      <div
        className="skel-donate"
        aria-busy="true"
        aria-label="Đang tải trang quyên góp"
      >
        <Bone className="h-5 w-48" />
        <div className="glass skel-card mt-4">
          <Bone className="h-3 w-36" />
          <Bone className="mt-4 h-9 w-4/5" />
          <Bone className="mt-3 h-12 w-full" />
        </div>
        <Bone className="mt-6 h-6 w-40" />
        <ul className="mt-3 grid gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <li key={key} className="card flex items-center gap-3 lg:flex-col">
              <Bone className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-full" />
                <Bone className="h-4 w-20" />
              </div>
              <Bone className="h-10 w-24 shrink-0" />
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-4">
          <Bone className="h-4 w-16" />
          <Bone className="h-12 w-full" />
          <Bone className="h-4 w-14" />
          <Bone className="h-12 w-full" />
          <Bone className="h-4 w-20" />
          <Bone className="h-24 w-full" />
        </div>
      </div>
    </Shell>
  );
}

export function PaySkeleton() {
  return (
    <Shell>
      <div className="skel-pay" aria-busy="true" aria-label="Đang tải thanh toán">
        <div className="glass skel-card skel-card--center w-full max-w-md">
          <Bone className="mx-auto h-7 w-48" />
          <Bone className="mx-auto mt-3 h-4 w-40" />
          <Bone className="mx-auto mt-6 h-10 w-36" />
          <Bone className="mx-auto mt-6 h-56 w-56 rounded-2xl" />
          <Bone className="mx-auto mt-6 h-4 w-52" />
          <Bone className="mx-auto mt-2 h-4 w-44" />
        </div>
      </div>
    </Shell>
  );
}

export function SuccessSkeleton() {
  return (
    <Shell>
      <div
        className="skel-pay"
        aria-busy="true"
        aria-label="Đang tải kết quả thanh toán"
      >
        <div className="glass skel-card skel-card--center w-full max-w-md">
          <Bone className="mx-auto h-8 w-56" />
          <Bone className="mx-auto mt-4 h-4 w-48" />
          <Bone className="mx-auto mt-6 h-24 w-full" />
          <Bone className="mx-auto mt-4 h-12 w-full" />
        </div>
      </div>
    </Shell>
  );
}

export function AdminSkeleton() {
  return (
    <Shell>
      <div className="admin-shell" aria-busy="true" aria-label="Đang tải admin">
        <div className="glass admin-header">
          <div>
            <Bone className="h-3 w-16" />
            <Bone className="mt-3 h-7 w-48" />
          </div>
          <Bone className="h-11 w-28" />
        </div>
        <div className="admin-stats">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="glass admin-stat">
              <Bone className="h-3 w-20" />
              <Bone className="mt-3 h-8 w-28" />
            </div>
          ))}
        </div>
        <div className="glass admin-panel">
          <div className="admin-toolbar">
            <Bone className="h-11 w-full" />
            <Bone className="h-11 w-full" />
            <Bone className="h-11 w-full" />
            <Bone className="h-11 w-28" />
          </div>
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <Bone key={key} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
