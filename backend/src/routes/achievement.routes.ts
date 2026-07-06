import type { FastifyPluginAsync } from "fastify";
import { AchievementService } from "@/services/achievement.service.js";

export const achievementRoutes: FastifyPluginAsync = async (app) => {
  const achievementService = new AchievementService(app.prisma, app.redis);

  app.get(
    "/achievements",
    { preValidation: [app.authenticate] },
    async (request) => {
      const achievements = await achievementService.getUserAchievements(request.currentUser!.id);
      
      const user = await app.prisma.user.findUnique({
        where: { id: request.currentUser!.id },
        select: { points: true, level: true }
      });

      return {
        achievements,
        points: user?.points ?? 0,
        level: user?.level ?? 1,
      };
    }
  );
};
