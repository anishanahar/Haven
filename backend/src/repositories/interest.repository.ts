import type { Prisma, PrismaClient } from "@prisma/client";

export class InterestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: {
    goalId: string;
    kind: string;
    amount: Prisma.Decimal | number | string;
    totalAfter: Prisma.Decimal | number | string;
    ledger: bigint;
    txHash: string;
  }) {
    return this.prisma.interest.create({ data });
  }

  totalClaimedForUser(userId: string) {
    return this.prisma.interest.aggregate({
      where: { kind: "claim", goal: { userId } },
      _sum: { amount: true },
    });
  }

  findManyForGoal(goalId: string) {
    return this.prisma.interest.findMany({ where: { goalId }, orderBy: { createdAt: "desc" } });
  }
}
