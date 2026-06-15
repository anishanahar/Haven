"use client";

import { Award, Coins, PiggyBank, Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { ContributionChart } from "@/components/dashboard/contribution-chart";
import { CalendarHeatmap } from "@/components/analytics/calendar-heatmap";
import { GoalSuccessList } from "@/components/analytics/goal-success-list";
import { useAnalytics } from "@/hooks/use-analytics";
import { formatMoney } from "@/lib/format";

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics(90);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Savings streak" value={`${data.savingsStreakDays} days`} icon={Repeat} accent="primary" />
        <StatCard label="Average deposit" value={formatMoney(data.averageDeposit)} icon={PiggyBank} accent="primary" />
        <StatCard label="Total deposits" value={String(data.depositCount)} icon={Coins} accent="success" />
        <StatCard label="Completed goals" value={String(data.completedGoals)} icon={Award} accent="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contribution history</CardTitle>
          </CardHeader>
          <CardContent>
            {data.contributionChart.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No deposits in this period yet.</p>
            ) : (
              <ContributionChart data={data.contributionChart} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings activity</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarHeatmap data={data.contributionChart} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goal success predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalSuccessList predictions={data.goalSuccessPredictions} />
        </CardContent>
      </Card>
    </div>
  );
}
