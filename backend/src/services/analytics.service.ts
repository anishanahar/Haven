import { AnalyticsRepository } from "@/repositories/analytics.repository.js";
import { GoalRepository } from "@/repositories/goal.repository.js";

export class AnalyticsService {
  constructor(
    private readonly analytics: AnalyticsRepository,
    private readonly goalRepo: GoalRepository,
  ) {}

  async getOverview(userId: string, days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    const [{ goalAgg, depositAgg, interestAgg, goalCounts }, dailyDeposits, goals] = await Promise.all([
      this.analytics.userTotals(userId),
      this.analytics.depositsByDay(userId, since),
      this.goalRepo.findManyByUser(userId, { includeClosed: true }),
    ]);

    const totalSaved = Number(goalAgg._sum.depositedAmount ?? 0);
    const totalAccruedInterest = Number(goalAgg._sum.accruedInterest ?? 0);
    const totalClaimedInterest = Number(interestAgg._sum.amount ?? 0);
    const depositCount = depositAgg._count;
    const depositTotal = Number(depositAgg._sum.amount ?? 0);
    const averageDeposit = depositCount > 0 ? depositTotal / depositCount : 0;

    const activeGoals = goalCounts.filter((g) => !g.closed && !g.completed).reduce((s, g) => s + g._count, 0);
    const completedGoals = goalCounts.filter((g) => g.completed).reduce((s, g) => s + g._count, 0);
    const totalGoals = goalCounts.reduce((s, g) => s + g._count, 0);
    const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    const contributionChart = dailyDeposits.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      total: Number(row.total),
      count: Number(row.count),
    }));

    const streak = computeStreak(dailyDeposits.map((r) => r.day));

    const successPredictions = goals
      .filter((g) => !g.closed && !g.completed)
      .map((g) => predictSuccess(g, dailyDeposits));

    return {
      totalSaved,
      totalInterestEarned: totalAccruedInterest + totalClaimedInterest,
      totalAccruedInterest,
      totalClaimedInterest,
      activeGoals,
      completedGoals,
      completionRate: Math.round(completionRate * 100) / 100,
      depositCount,
      averageDeposit: Math.round(averageDeposit * 1e7) / 1e7,
      savingsStreakDays: streak,
      contributionChart,
      goalSuccessPredictions: successPredictions,
    };
  }
}

function computeStreak(depositDays: Date[]): number {
  if (depositDays.length === 0) return 0;
  const daySet = new Set(depositDays.map((d) => d.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  // A deposit today isn't required to keep a streak alive through "yesterday" —
  // start checking from today and stop at the first gap.
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!daySet.has(key)) {
      if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Deterministic, explainable "will this goal hit its deadline?" heuristic — no ML, no external AI calls. */
function predictSuccess(
  goal: { id: string; name: string; targetAmount: unknown; depositedAmount: unknown; unlockDate: Date; createdAt: Date },
  dailyDeposits: { day: Date; total: string }[],
) {
  const target = Number(goal.targetAmount);
  const deposited = Number(goal.depositedAmount);
  const remaining = Math.max(target - deposited, 0);

  const daysSinceCreation = Math.max((Date.now() - goal.createdAt.getTime()) / 86_400_000, 1);
  const daysUntilDeadline = Math.max((goal.unlockDate.getTime() - Date.now()) / 86_400_000, 0);

  const totalDeposited = dailyDeposits.reduce((s, r) => s + Number(r.total), 0);
  const impliedDailyRate = totalDeposited > 0 ? totalDeposited / daysSinceCreation : deposited / daysSinceCreation;

  const projectedAtDeadline = deposited + impliedDailyRate * daysUntilDeadline;
  const onTrack = projectedAtDeadline >= target;
  const requiredDailyRate = daysUntilDeadline > 0 ? remaining / daysUntilDeadline : remaining;

  const confidence =
    impliedDailyRate <= 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((impliedDailyRate / Math.max(requiredDailyRate, 1e-9)) * 100)));

  return {
    goalId: goal.id,
    name: goal.name,
    onTrack,
    confidencePercent: Math.min(confidence, 100),
    impliedDailyRate: Math.round(impliedDailyRate * 1e7) / 1e7,
    requiredDailyRate: Math.round(requiredDailyRate * 1e7) / 1e7,
  };
}
