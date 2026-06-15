"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WalletGate } from "@/components/layout/wallet-gate";
import { dashboardNav } from "@/config/site";
import { useAuth } from "@/hooks/use-auth";

function useSectionTitle() {
  const pathname = usePathname();
  const match = [...dashboardNav].reverse().find((item) => pathname.startsWith(item.href));
  return match?.label ?? "Dashboard";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const title = useSectionTitle();

  if (!isAuthenticated) {
    return <WalletGate />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} title={title} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
