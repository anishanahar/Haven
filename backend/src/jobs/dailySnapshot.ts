import type { PrismaClient } from "@prisma/client";
import { AnalyticsRepository } from "@/repositories/analytics.repository.js";
import { GoalRepository } from "@/repositories/goal.repository.js";
import { AnalyticsService } from "@/services/analytics.service.js";

/** Writes one `AnalyticsSnapshot` row per active user for "today" (UTC), so historical trend charts don't require re-aggregating full transaction history on every dashboard load. */
export async function runDailySnapshot(prisma: PrismaClient, log: { info: (o: unknown, msg?: string) => void }) {
  const analyticsRepo = new AnalyticsRepository(prisma);
  const goalRepo = new GoalRepository(prisma);
  const analyticsService = new AnalyticsService(analyticsRepo, goalRepo);

  const users = await prisma.user.findMany({ select: { id: true } });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let written = 0;
  for (const user of users) {
    const overview = await analyticsService.getOverview(user.id, 1);
    await analyticsRepo.upsertDailySnapshot(user.id, today, {
      totalSaved: overview.totalSaved.toString(),
      totalInterest: overview.totalInterestEarned.toString(),
      activeGoals: overview.activeGoals,
      completedGoals: overview.completedGoals,
      depositCount: overview.depositCount,
      depositTotal: (overview.averageDeposit * overview.depositCount).toString(),
    });
    written += 1;
  }

  log.info({ written }, "jobs: daily analytics snapshot complete");
}
