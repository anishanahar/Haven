"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalCard } from "@/components/goals/goal-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useGoals } from "@/hooks/use-goals";

export default function GoalsPage() {
  const [tab, setTab] = useState<"active" | "all">("active");
  const { data: goals, isLoading } = useGoals(tab === "all");

  const visible = (goals ?? []).filter((g) => (tab === "active" ? !g.closed : true));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "all")}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All goals</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button nativeButton={false} render={<Link href="/dashboard/goals/new" />}>
          <Plus /> New goal
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals here yet"
            description="Create a goal to deploy your first on-chain savings vault."
            action={
              <Button nativeButton={false} render={<Link href="/dashboard/goals/new" />}>
                <Plus /> Create a goal
              </Button>
            }
          />
        ) : (
          visible.map((goal, i) => <GoalCard key={goal.id} goal={goal} index={i} />)
        )}
      </div>
    </div>
  );
}
