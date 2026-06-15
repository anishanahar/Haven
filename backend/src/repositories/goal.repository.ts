import type { Prisma, PrismaClient } from "@prisma/client";

export class GoalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findManyByUser(userId: string, opts: { includeClosed?: boolean } = {}) {
    return this.prisma.goal.findMany({
      where: { userId, ...(opts.includeClosed ? {} : { closed: false }) },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.goal.findUnique({ where: { id } });
  }

  findByVaultAddress(vaultAddress: string) {
    return this.prisma.goal.findUnique({ where: { vaultAddress } });
  }

  findByOnChainGoalId(goalId: bigint) {
    return this.prisma.goal.findUnique({ where: { goalId } });
  }

  create(data: Prisma.GoalCreateInput) {
    return this.prisma.goal.create({ data });
  }

  update(id: string, data: Prisma.GoalUpdateInput) {
    return this.prisma.goal.update({ where: { id }, data });
  }

  upsertByOnChainGoalId(goalId: bigint, create: Prisma.GoalCreateInput, update: Prisma.GoalUpdateInput) {
    return this.prisma.goal.upsert({ where: { goalId }, create, update });
  }

  appendHistory(goalId: string, data: { eventType: string; payload: Prisma.InputJsonValue; ledger: bigint; txHash: string }) {
    return this.prisma.goalHistory.create({ data: { goalId, ...data } });
  }

  historyFor(goalId: string) {
    return this.prisma.goalHistory.findMany({ where: { goalId }, orderBy: { createdAt: "desc" } });
  }
}
