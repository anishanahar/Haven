import { ArrowDownLeft, ArrowUpRight, Coins, PlusCircle, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatMoney, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/api";

const typeMeta: Record<TransactionType, { icon: LucideIcon; label: string; tone: string }> = {
  DEPOSIT: { icon: ArrowDownLeft, label: "Deposit", tone: "bg-success/15 text-success" },
  WITHDRAWAL: { icon: ArrowUpRight, label: "Withdrawal", tone: "bg-warning/15 text-warning" },
  CLAIM_INTEREST: { icon: Coins, label: "Interest claimed", tone: "bg-primary/15 text-primary" },
  CREATE_GOAL: { icon: PlusCircle, label: "Goal created", tone: "bg-primary/15 text-primary" },
  DELETE_GOAL: { icon: Trash2, label: "Goal closed", tone: "bg-destructive/15 text-destructive" },
};

export function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity yet — make your first deposit.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {transactions.map((tx) => {
        const meta = typeMeta[tx.type];
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
              <meta.icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {meta.label} · {tx.goal.name}
              </p>
              <p className="text-xs text-muted-foreground">{formatRelative(tx.createdAt)}</p>
            </div>
            {Number(tx.amount) > 0 && (
              <span className="shrink-0 text-sm font-medium tabular-nums">{formatMoney(Number(tx.amount))}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
