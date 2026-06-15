import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

export const ACHIEVEMENTS = {
  FIRST_DEPOSIT: { id: "FIRST_DEPOSIT", title: "First Steps", description: "Made your first deposit.", points: 10, icon: "Wallet" },
  SAVED_100: { id: "SAVED_100", title: "Century Saver", description: "Saved your first $100.", points: 50, icon: "Coins" },
  GOAL_COMPLETED: { id: "GOAL_COMPLETED", title: "Goal Crusher", description: "Completed your first goal.", points: 100, icon: "Trophy" },
  STREAK_3: { id: "STREAK_3", title: "On a Roll", description: "Made deposits on 3 different days.", points: 30, icon: "Flame" },
};

export class AchievementService {
  constructor(private prisma: PrismaClient, private redis: Redis) {}

  async evaluate(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        goals: true,
        achievements: true,
      }
    });
    if (!user) return;

    const unlocked = new Set(user.achievements.map((a) => a.achievementId));
    const newUnlocks: string[] = [];
    let pointsGained = 0;

    // FIRST_DEPOSIT
    if (!unlocked.has(ACHIEVEMENTS.FIRST_DEPOSIT.id)) {
      const totalSaved = user.goals.reduce((acc, g) => acc + Number(g.depositedAmount), 0);
      if (totalSaved > 0) {
        newUnlocks.push(ACHIEVEMENTS.FIRST_DEPOSIT.id);
        pointsGained += ACHIEVEMENTS.FIRST_DEPOSIT.points;
      }
    }

    // SAVED_100
    if (!unlocked.has(ACHIEVEMENTS.SAVED_100.id)) {
      const totalSaved = user.goals.reduce((acc, g) => acc + Number(g.depositedAmount), 0);
      if (totalSaved >= 100) {
        newUnlocks.push(ACHIEVEMENTS.SAVED_100.id);
        pointsGained += ACHIEVEMENTS.SAVED_100.points;
      }
    }

    // GOAL_COMPLETED
    if (!unlocked.has(ACHIEVEMENTS.GOAL_COMPLETED.id)) {
      const hasCompleted = user.goals.some((g) => g.completed);
      if (hasCompleted) {
        newUnlocks.push(ACHIEVEMENTS.GOAL_COMPLETED.id);
        pointsGained += ACHIEVEMENTS.GOAL_COMPLETED.points;
      }
    }

    // STREAK_3: Checking distinct days with deposits using transactions table
    if (!unlocked.has(ACHIEVEMENTS.STREAK_3.id)) {
      const depositTx = await this.prisma.transaction.findMany({
        where: { userId, type: "DEPOSIT", status: "SUCCESS" },
        select: { createdAt: true }
      });
      const distinctDays = new Set(depositTx.map(tx => tx.createdAt.toISOString().split("T")[0]));
      if (distinctDays.size >= 3) {
        newUnlocks.push(ACHIEVEMENTS.STREAK_3.id);
        pointsGained += ACHIEVEMENTS.STREAK_3.points;
      }
    }

    if (newUnlocks.length > 0) {
      await this.prisma.$transaction(
        newUnlocks.map((id) =>
          this.prisma.userAchievement.create({
            data: { userId, achievementId: id }
          })
        )
      );

      const newPoints = user.points + pointsGained;
      const newLevel = Math.floor(newPoints / 100) + 1;
      
      await this.prisma.user.update({
        where: { id: userId },
        data: { points: newPoints, level: newLevel }
      });

      for (const id of newUnlocks) {
        await this.redis.publish(
          `user:${userId}:events`,
          JSON.stringify({ type: "AchievementUnlocked", achievementId: id, details: ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS] })
        );
      }
    }
  }

  async getUserAchievements(userId: string) {
    const userAchvs = await this.prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" }
    });
    return userAchvs.map(ua => ({
      id: ua.id,
      achievementId: ua.achievementId,
      unlockedAt: ua.unlockedAt,
      details: ACHIEVEMENTS[ua.achievementId as keyof typeof ACHIEVEMENTS]
    }));
  }
}
