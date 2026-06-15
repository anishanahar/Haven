import type { PrismaClient } from "@prisma/client";

export async function getCursor(prisma: PrismaClient): Promise<number> {
  const row = await prisma.indexerCursor.findUnique({ where: { id: 1 } });
  return row ? Number(row.lastLedger) : 0;
}

export async function setCursor(prisma: PrismaClient, ledger: number): Promise<void> {
  await prisma.indexerCursor.upsert({
    where: { id: 1 },
    create: { id: 1, lastLedger: BigInt(ledger) },
    update: { lastLedger: BigInt(ledger) },
  });
}
