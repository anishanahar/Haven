"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/shared/connect-wallet-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Topbar({ onMenuClick, title }: { onMenuClick?: () => void; title?: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu />
        </Button>
        {title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        <ConnectWalletButton />
      </div>
    </header>
  );
}
