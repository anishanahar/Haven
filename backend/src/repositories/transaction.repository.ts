import type { Prisma, PrismaClient, TransactionStatus, TransactionType } from "@prisma/client";

export class TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: {
    goalId: string;
    userId: string;
    type: TransactionType;
    amount: Prisma.Decimal | number | string;
    status?: TransactionStatus;
    txHash?: string;
    ledger?: bigint;
  }) {
    return this.prisma.transaction.create({
      data: { ...data, confirmedAt: data.status === "SUCCESS" ? new Date() : undefined },
    });
  }

  findByTxHash(txHash: string) {
    return this.prisma.transaction.findUnique({ where: { txHash } });
  }

  updateStatus(id: string, status: TransactionStatus, extra: { ledger?: bigint; errorMessage?: string } = {}) {
    return this.prisma.transaction.update({
      where: { id },
      data: { status, confirmedAt: status === "SUCCESS" ? new Date() : undefined, ...extra },
    });
  }

  findManyForUser(userId: string, opts: { goalId?: string; limit?: number; cursor?: string } = {}) {
    return this.prisma.transaction.findMany({
      where: { userId, ...(opts.goalId ? { goalId: opts.goalId } : {}) },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 50,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      include: { goal: { select: { id: true, name: true, icon: true } } },
    });
  }
}
