import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  Sparkles,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import type { GoalHistoryEntry } from "@/types/api";

const eventMeta: Record<string, { icon: LucideIcon; label: string }> = {
  created: { icon: PlusCircle, label: "Goal created" },
  goal_created: { icon: PlusCircle, label: "Goal created" },
  deposit: { icon: ArrowDownLeft, label: "Deposit" },
  deposit_made: { icon: ArrowDownLeft, label: "Deposit" },
  withdrawal: { icon: ArrowUpRight, label: "Withdrawal" },
  interest_claimed: { icon: Coins, label: "Interest claimed" },
  interest_accrued: { icon: Coins, label: "Interest accrued" },
  target_changed: { icon: Target, label: "Target changed" },
  deadline_extended: { icon: Target, label: "Deadline extended" },
  metadata_updated: { icon: Sparkles, label: "Details updated" },
  paused: { icon: PauseCircle, label: "Goal paused" },
  resumed: { icon: PlayCircle, label: "Goal resumed" },
  deleted: { icon: Trash2, label: "Goal closed" },
  goal_deleted: { icon: Trash2, label: "Goal closed" },
  goal_completed: { icon: Target, label: "Target reached" },
};

export function GoalHistoryTimeline({ history }: { history: GoalHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No history yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-5">
      {history.map((entry, i) => {
        const meta = eventMeta[entry.eventType] ?? { icon: Sparkles, label: entry.eventType };
        return (
          <li key={entry.id} className="relative flex gap-3 pl-1">
            {i < history.length - 1 && (
              <span className="absolute top-8 left-[15px] h-full w-px bg-border" aria-hidden />
            )}
            <div className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
              <meta.icon className="size-3.5 text-primary" />
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium">{meta.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(entry.createdAt)} · ledger {entry.ledger}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
