"use client";

import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/hooks/use-auth";

export function WalletGate() {
  const { connect, isConnecting } = useAuth();

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-grid px-6 text-center">
      <Logo className="mb-8 text-xl" />
      <div className="glass glow-primary max-w-sm rounded-3xl p-8">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Wallet className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Connect your wallet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with a Stellar wallet to view and manage your savings goals. Haven never asks for your private key.
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={() => connect()} disabled={isConnecting}>
          {isConnecting ? <Loader2 className="animate-spin" /> : <Wallet />}
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </div>
    </div>
  );
}
