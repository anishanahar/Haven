"use client";

import { use } from "react";
import { Calendar, Coins, PauseCircle, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@/components/shared/circular-progress";
import { GoalIcon } from "@/lib/goal-icons";
import { DepositDialog } from "@/components/goals/deposit-dialog";
import { WithdrawDialog } from "@/components/goals/withdraw-dialog";
import { ClaimInterestButton } from "@/components/goals/claim-interest-button";
import { GoalActionsMenu } from "@/components/goals/goal-actions-menu";
import { GoalHistoryTimeline } from "@/components/goals/goal-history-timeline";
import { useGoal, useGoalHistory } from "@/hooks/use-goals";
import { formatDate, formatMoney } from "@/lib/format";

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: goal, isLoading } = useGoal(id);
  const { data: history } = useGoalHistory(id);

  if (isLoading || !goal) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass glow-primary relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <CircularProgress percent={goal.progressPercent} size={72} strokeWidth={6}>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <GoalIcon icon={goal.icon} className="size-5" />
              </div>
            </CircularProgress>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{goal.name}</h1>
                {goal.paused && (
                  <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                    <PauseCircle className="size-3" /> Paused
                  </span>
                )}
                {goal.completed && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    Completed
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatMoney(goal.depositedAmount)} of {formatMoney(goal.targetAmount)} · due {formatDate(goal.unlockDate)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DepositDialog goalId={goal.id} />
            <WithdrawDialog goalId={goal.id} maxAmount={goal.depositedAmount} />
            <ClaimInterestButton goalId={goal.id} disabled={goal.accruedInterest <= 0} />
            <GoalActionsMenu goal={goal} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat icon={Target} label="Remaining" value={formatMoney(goal.remaining)} />
        <MiniStat icon={TrendingUp} label="Accrued interest" value={formatMoney(goal.accruedInterest)} tone="success" />
        <MiniStat icon={Coins} label="Claimed interest" value={formatMoney(goal.claimedInterest)} />
        <MiniStat icon={Calendar} label="APY" value={`${(goal.apyBps / 100).toFixed(2)}%`} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalHistoryTimeline history={history ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Target;
  label: string;
  value: string;
  tone?: "primary" | "success";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`flex size-8 items-center justify-center rounded-lg ${tone === "success" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}>
        <Icon className="size-4" />
      </div>
      <p className="mt-3 text-lg font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
