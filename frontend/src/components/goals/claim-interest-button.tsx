"use client";

import { Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClaimInterest } from "@/hooks/use-transactions";

export function ClaimInterestButton({ goalId, disabled }: { goalId: string; disabled?: boolean }) {
  const claim = useClaimInterest();

  return (
    <Button variant="secondary" disabled={disabled || claim.isPending} onClick={() => claim.mutate({ goalId })}>
      {claim.isPending ? <Loader2 className="animate-spin" /> : <Coins />}
      {claim.isPending ? "Claiming…" : "Claim interest"}
    </Button>
  );
}
