/**
 * Prisma returns `BigInt` for our `BigInt` columns (goal.goalId,
 * transaction.ledger, goalHistory.ledger, interest.ledger) and
 * `JSON.stringify`/Fastify's serializer both throw on a bare BigInt. Rather
 * than hand-map every raw repository pass-through into a DTO, patch the
 * one conversion rule we always want: BigInt -> decimal string. Values that
 * need it as a number (rare — IDs this large don't fit in a JS number
 * safely) get parsed back out explicitly where needed.
 */
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function (this: bigint) {
  return this.toString();
};

export {};
