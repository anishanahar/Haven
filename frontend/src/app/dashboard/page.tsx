"use client";

import Link from "next/link";
import { Coins, Percent, PiggyBank, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { ContributionChart } from "@/components/dashboard/contribution-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { GoalCard } from "@/components/goals/goal-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useAnalytics } from "@/hooks/use-analytics";
import { useGoals } from "@/hooks/use-goals";
import { useTransactions } from "@/hooks/use-transactions";
import { formatMoney, formatPercent } from "@/lib/format";

export default function DashboardOverviewPage() {
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(30);
  const { data: transactions, isLoading: txLoading } = useTransactions({ limit: 6 });

  const upcomingGoals = (goals ?? []).filter((g) => !g.closed && !g.completed).slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {analyticsLoading || !analytics ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Total saved" value={formatMoney(analytics.totalSaved)} icon={PiggyBank} accent="primary" />
            <StatCard
              label="Interest earned"
              value={formatMoney(analytics.totalInterestEarned)}
              icon={Coins}
              accent="success"
              trend={{ value: `${formatMoney(analytics.totalAccruedInterest)} unclaimed`, positive: true }}
            />
            <StatCard label="Active goals" value={String(analytics.activeGoals)} icon={Target} accent="primary" />
            <StatCard
              label="Completion rate"
              value={formatPercent(analytics.completionRate)}
              icon={Percent}
              accent="warning"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Monthly deposits</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : analytics.contributionChart.length === 0 ? (
              <EmptyState icon={PiggyBank} title="No deposits yet" description="Your contribution history will show up here once you make your first deposit." />
            ) : (
              <ContributionChart data={analytics.contributionChart} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <RecentActivity transactions={transactions ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Upcoming goals</CardTitle>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/dashboard/goals" />}>
            View all
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {goalsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
          ) : upcomingGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No goals yet"
              description="Create your first savings goal — a laptop, a trip, an emergency fund — and deploy your own on-chain vault."
              action={
                <Button nativeButton={false} render={<Link href="/dashboard/goals/new" />}>
                  <Plus /> Create a goal
                </Button>
              }
            />
          ) : (
            upcomingGoals.map((goal, i) => <GoalCard key={goal.id} goal={goal} index={i} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
