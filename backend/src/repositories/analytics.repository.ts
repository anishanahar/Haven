import type { PrismaClient } from "@prisma/client";

export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async userTotals(userId: string) {
    const [goalAgg, depositAgg, interestAgg, goalCounts] = await Promise.all([
      this.prisma.goal.aggregate({
        where: { userId, closed: false },
        _sum: { depositedAmount: true, accruedInterest: true, claimedInterest: true, targetAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: "DEPOSIT", status: "SUCCESS" },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.interest.aggregate({
        where: { kind: "claim", goal: { userId } },
        _sum: { amount: true },
      }),
      this.prisma.goal.groupBy({
        by: ["completed", "closed"],
        where: { userId },
        _count: true,
      }),
    ]);

    return { goalAgg, depositAgg, interestAgg, goalCounts };
  }

  /** Deposits bucketed by day, for the monthly-savings / contribution chart. */
  depositsByDay(userId: string, since: Date) {
    return this.prisma.$queryRaw<{ day: Date; total: string; count: bigint }[]>`
      SELECT date_trunc('day', "created_at") AS day,
             SUM("amount")::text AS total,
             COUNT(*) AS count
      FROM "transactions"
      WHERE "user_id" = ${userId} AND "type" = 'DEPOSIT' AND "status" = 'SUCCESS' AND "created_at" >= ${since}
      GROUP BY day
      ORDER BY day ASC
    `;
  }

  upsertDailySnapshot(
    userId: string,
    date: Date,
    data: {
      totalSaved: string;
      totalInterest: string;
      activeGoals: number;
      completedGoals: number;
      depositCount: number;
      depositTotal: string;
    },
  ) {
    return this.prisma.analyticsSnapshot.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...data },
      update: data,
    });
  }

  snapshotsSince(userId: string, since: Date) {
    return this.prisma.analyticsSnapshot.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "asc" },
    });
  }
}
