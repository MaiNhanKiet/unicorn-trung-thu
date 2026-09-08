import type { Metadata } from "next";
import Image from "next/image";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLoginForm } from "@/components/admin-login-form";
import { ensureBootstrapAdmin, getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await ensureBootstrapAdmin();
  const session = await getAdminSession();

  return (
    <div className="page-shell min-h-full">
      <div className="page-backdrop">
        <Image
          src="/image/street-night.png"
          alt=""
          fill
          sizes="100vw"
          className="pixel-sprite"
          priority
        />
        <div className="page-veil" />
      </div>
      <div className="relative z-10">
        {session ? (
          <AdminDashboard username={session.username} />
        ) : (
          <div className="admin-login-screen">
            <AdminLoginForm />
          </div>
        )}
      </div>
    </div>
  );
}
