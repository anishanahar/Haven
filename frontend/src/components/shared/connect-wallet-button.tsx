"use client";

import { Loader2, LogOut, Wallet } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { formatAddress } from "@/lib/format";

export function ConnectWalletButton({ className }: { className?: string }) {
  const { isAuthenticated, isConnecting, user, connect, logout, isLoggingOut } = useAuth();

  if (!isAuthenticated) {
    return (
      <Button onClick={() => connect()} disabled={isConnecting} className={className}>
        {isConnecting ? <Loader2 className="animate-spin" /> : <Wallet />}
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "secondary" }), className)}>
        <Wallet />
        {formatAddress(user?.publicKey ?? "")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="font-mono text-xs">
          {user?.publicKey}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logout()} disabled={isLoggingOut}>
          <LogOut /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
