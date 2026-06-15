import "@/utils/bigint-json.js";

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

import { env } from "@/config/env.js";
import prismaPlugin from "@/plugins/prisma.js";
import redisPlugin from "@/plugins/redis.js";
import authPlugin from "@/plugins/auth.js";
import websocketPlugin from "@/plugins/websocket.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import { buildContainer } from "@/container.js";

import authRoutes from "@/routes/auth.routes.js";
import goalRoutes from "@/routes/goal.routes.js";
import transactionRoutes from "@/routes/transaction.routes.js";
import analyticsRoutes from "@/routes/analytics.routes.js";
import { achievementRoutes } from "./routes/achievement.routes.js";
import notificationRoutes from "@/routes/notification.routes.js";
import plannerRoutes from "@/routes/planner.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
    trustProxy: true,
  });

  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);
  await app.register(websocketPlugin);

  app.decorate("container", buildContainer(app));

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  await app.register(authRoutes);
  await app.register(goalRoutes);
  await app.register(transactionRoutes);
  await app.register(analyticsRoutes);
  await app.register(achievementRoutes);
  await app.register(notificationRoutes);
  await app.register(plannerRoutes);

  return app;
}
