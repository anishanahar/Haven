"use client";

import { useState } from "react";
import { Loader2, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeposit } from "@/hooks/use-transactions";

export function DepositDialog({ goalId }: { goalId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const deposit = useDeposit();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await deposit.mutateAsync({ goalId, amount: Number(amount) });
    setOpen(false);
    setAmount("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PiggyBank /> Deposit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit to this goal</DialogTitle>
          <DialogDescription>
            You&apos;ll be asked to sign a transaction with your wallet to transfer USDC into this goal&apos;s vault.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="deposit-amount">Amount (USDC)</Label>
            <Input
              id="deposit-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={deposit.isPending || !amount}>
              {deposit.isPending && <Loader2 className="animate-spin" />}
              {deposit.isPending ? "Confirming…" : "Deposit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
