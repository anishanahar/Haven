import type { FastifyInstance } from "fastify";
import { UserRepository } from "@/repositories/user.repository.js";
import { AuthChallengeRepository, SessionRepository } from "@/repositories/session.repository.js";
import { GoalRepository } from "@/repositories/goal.repository.js";
import { TransactionRepository } from "@/repositories/transaction.repository.js";
import { InterestRepository } from "@/repositories/interest.repository.js";
import { NotificationRepository } from "@/repositories/notification.repository.js";
import { AnalyticsRepository } from "@/repositories/analytics.repository.js";

import { sep10Service } from "@/services/sep10.service.js";
import { sorobanService } from "@/services/soroban.service.js";
import { AuthService } from "@/services/auth.service.js";
import { GoalService } from "@/services/goal.service.js";
import { TransactionService } from "@/services/transaction.service.js";
import { AnalyticsService } from "@/services/analytics.service.js";
import { NotificationService } from "@/services/notification.service.js";

import { AuthController } from "@/controllers/auth.controller.js";
import { GoalController } from "@/controllers/goal.controller.js";
import { TransactionController } from "@/controllers/transaction.controller.js";
import { AnalyticsController } from "@/controllers/analytics.controller.js";
import { NotificationController } from "@/controllers/notification.controller.js";
import { PlannerController } from "@/controllers/planner.controller.js";

export type Container = ReturnType<typeof buildContainer>;

export function buildContainer(app: FastifyInstance) {
  const repositories = {
    users: new UserRepository(app.prisma),
    sessions: new SessionRepository(app.prisma),
    challenges: new AuthChallengeRepository(app.prisma),
    goals: new GoalRepository(app.prisma),
    transactions: new TransactionRepository(app.prisma),
    interest: new InterestRepository(app.prisma),
    notifications: new NotificationRepository(app.prisma),
    analytics: new AnalyticsRepository(app.prisma),
  };

  const services = {
    auth: new AuthService(repositories.challenges, repositories.sessions, repositories.users, sep10Service),
    goal: new GoalService(repositories.goals, repositories.transactions, sorobanService),
    transaction: new TransactionService(
      repositories.goals,
      repositories.transactions,
      repositories.interest,
      repositories.notifications,
      sorobanService,
    ),
    analytics: new AnalyticsService(repositories.analytics, repositories.goals),
    notification: new NotificationService(repositories.notifications),
  };

  const controllers = {
    auth: new AuthController(services.auth, repositories.users),
    goal: new GoalController(services.goal),
    transaction: new TransactionController(services.transaction, repositories.transactions),
    analytics: new AnalyticsController(services.analytics),
    notification: new NotificationController(services.notification),
    planner: new PlannerController(),
  };

  return { repositories, services, controllers };
}
