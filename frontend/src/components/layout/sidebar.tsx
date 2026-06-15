"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { dashboardNav } from "@/config/site";
import { NavIcon } from "@/lib/nav-icons";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 px-2">
        <Logo />
      </Link>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Dashboard">
        {dashboardNav.map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <NavIcon icon={item.icon} className="size-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="font-medium">Stellar Testnet</p>
        <p className="mt-1 text-xs text-muted-foreground">Every action here is a real Soroban transaction on testnet.</p>
      </div>
    </aside>
  );
}
