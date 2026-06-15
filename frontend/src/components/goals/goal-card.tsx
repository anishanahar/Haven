"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PauseCircle } from "lucide-react";
import { CircularProgress } from "@/components/shared/circular-progress";
import { GoalIcon } from "@/lib/goal-icons";
import { formatCompactMoney, formatDate } from "@/lib/format";
import type { Goal } from "@/types/api";

export function GoalCard({ goal, index = 0 }: { goal: Goal; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <Link
        href={`/dashboard/goals/${goal.id}`}
        className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
      >
        <CircularProgress percent={goal.progressPercent} size={56} strokeWidth={5}>
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <GoalIcon icon={goal.icon} className="size-4.5" />
          </div>
        </CircularProgress>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{goal.name}</p>
            {goal.paused && <PauseCircle className="size-3.5 shrink-0 text-warning" />}
            {goal.completed && (
              <span className="shrink-0 rounded-full bg-nest-accent/15 px-2 py-0.5 text-[11px] font-medium text-nest-accent">
                Completed
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCompactMoney(goal.depositedAmount)} of {formatCompactMoney(goal.targetAmount)} · due {formatDate(goal.unlockDate)}
          </p>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm font-medium">{goal.progressPercent.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">{goal.apyBps / 100}% APY</p>
        </div>
      </Link>
    </motion.div>
  );
}
