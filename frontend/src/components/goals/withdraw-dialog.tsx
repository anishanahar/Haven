"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
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
import { useWithdraw } from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/format";

export function WithdrawDialog({ goalId, maxAmount }: { goalId: string; maxAmount: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const withdraw = useWithdraw();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await withdraw.mutateAsync({ goalId, amount: Number(amount) });
    setOpen(false);
    setAmount("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <ArrowUpRight /> Withdraw
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw from this goal</DialogTitle>
          <DialogDescription>
            Withdraw part or all of your principal at any time — Haven never locks your funds.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="withdraw-amount">Amount (USDC)</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setAmount(String(maxAmount))}
              >
                Max: {formatMoney(maxAmount)}
              </button>
            </div>
            <Input
              id="withdraw-amount"
              type="number"
              min={0.01}
              max={maxAmount}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={withdraw.isPending || !amount}>
              {withdraw.isPending && <Loader2 className="animate-spin" />}
              {withdraw.isPending ? "Confirming…" : "Withdraw"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
