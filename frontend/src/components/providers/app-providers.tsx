"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WebSocketProvider } from "@/components/providers/websocket-provider";
import { ensureWalletKitInitialized } from "@/lib/wallet-kit";
import { useEffect } from "react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureWalletKitInitialized();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryProvider>
        <TooltipProvider delay={150}>
          <WebSocketProvider>{children}</WebSocketProvider>
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
