import type { PrismaClient } from "@prisma/client";
import { scValToNative, type rpc } from "@stellar/stellar-sdk";
import type { Redis } from "ioredis";
import { SorobanService } from "@/services/soroban.service.js";
import { AchievementService } from "@/services/achievement.service.js";
import { fromStroops } from "@/utils/amounts.js";
import { env } from "@/config/env.js";

/**
 * All Haven contract events share the same topic shape:
 * `(event_name: Symbol, goal_id: u64, ...extra_topics)`. See
 * `docs/contracts.md`'s events table for the exact per-event topic list
 * (e.g. `InterestAccrued` additionally carries `owner` then `kind`).
 */
export interface DecodedEvent {
  name: string;
  goalId: bigint | undefined;
  topics: unknown[];
  data: Record<string, unknown> | undefined;
  contractId: string;
  ledger: number;
  txHash: string;
}

export function decodeEvent(event: rpc.Api.EventResponse): DecodedEvent {
  const topics = event.topic.map((t) => scValToNative(t));
  const name = String(topics[0] ?? "unknown");
  const goalId = typeof topics[1] === "bigint" ? topics[1] : undefined;
  const data = event.value ? (scValToNative(event.value) as Record<string, unknown>) : undefined;

  return {
    name,
    goalId,
    topics,
    data,
    contractId: event.contractId?.toString() ?? "",
    ledger: event.ledger,
    txHash: event.txHash,
  };
}

export interface HandlerCtx {
  prisma: PrismaClient;
  redis: Redis;
  soroban: SorobanService;
}

export function buildHandlerCtx(prisma: PrismaClient, redis: Redis): HandlerCtx {
  return { prisma, redis, soroban: new SorobanService(env.SOROBAN_RPC_URL, env.STELLAR_NETWORK_PASSPHRASE) };
}

/** Reads the full on-chain goal state and mirrors it onto our Goal row — the read-through refresh every vault-state handler triggers after recording its specific delta, so we never drift even if event data alone were ever insufficient. */
async function refreshGoalFromChain(ctx: HandlerCtx, vaultAddress: string) {
  const onChain = await ctx.soroban.simulateRead<{
    name: string;
    icon: string;
    target_amount: bigint;
    deposited_amount: bigint;
    unlock_date: bigint;
    completed: boolean;
    paused: boolean;
    closed: boolean;
    accrued_interest: bigint;
    claimed_interest: bigint;
  }>(vaultAddress, "get_goal", []);

  await ctx.prisma.goal.updateMany({
    where: { vaultAddress },
    data: {
      name: onChain.name,
      icon: onChain.icon,
      targetAmount: fromStroops(onChain.target_amount),
      depositedAmount: fromStroops(onChain.deposited_amount),
      accruedInterest: fromStroops(onChain.accrued_interest),
      claimedInterest: fromStroops(onChain.claimed_interest),
      unlockDate: new Date(Number(onChain.unlock_date) * 1000),
      completed: onChain.completed,
      paused: onChain.paused,
      closed: onChain.closed,
    },
  });
}

async function publishToUser(ctx: HandlerCtx, userId: string, payload: unknown) {
  await ctx.redis.publish(`user:${userId}:events`, JSON.stringify(payload));
}

/** Prisma's Json column round-trips through JSON.stringify, which throws on bigint — decoded event data (u64/i128 fields) comes back from scValToNative as bigint, so it has to be stringified before it can be stored. */
function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJsonSafe(v)]));
  }
  return value;
}

async function appendHistoryOnce(
  ctx: HandlerCtx,
  goalDbId: string,
  eventType: string,
  payload: Record<string, unknown>,
  ledger: number,
  txHash: string,
) {
  const exists = await ctx.prisma.goalHistory.findFirst({ where: { goalId: goalDbId, eventType, txHash } });
  if (exists) return false;
  await ctx.prisma.goalHistory.create({
    data: { goalId: goalDbId, eventType, payload: toJsonSafe(payload) as never, ledger: BigInt(ledger), txHash },
  });
  return true;
}

/** `GoalCreated` topics: (name, goal_id, owner). Emitted only by `goal-factory`. */
export async function handleGoalCreated(ctx: HandlerCtx, event: DecodedEvent) {
  const data = event.data as { vault: string; name: string; target_amount: bigint; unlock_date: bigint };
  const ownerPublicKey = String(event.topics[2]);

  const existing = await ctx.prisma.goal.findUnique({ where: { vaultAddress: data.vault } });
  if (existing) return;

  const user = await ctx.prisma.user.upsert({
    where: { publicKey: ownerPublicKey },
    create: { publicKey: ownerPublicKey, wallets: { create: { publicKey: ownerPublicKey, isPrimary: true } } },
    update: {},
  });

  const goal = await ctx.prisma.goal.create({
    data: {
      goalId: event.goalId!,
      vaultAddress: data.vault,
      userId: user.id,
      name: data.name,
      icon: "custom",
      targetAmount: fromStroops(data.target_amount),
      unlockDate: new Date(Number(data.unlock_date) * 1000),
      apyBps: 500,
    },
  });

  await appendHistoryOnce(ctx, goal.id, "created", data, event.ledger, event.txHash);
  await publishToUser(ctx, user.id, { type: "GoalCreated", goalId: goal.id });
}

/** `GoalDeleted` topics: (name, goal_id, owner). Emitted only by `goal-factory`. */
export async function handleGoalDeleted(ctx: HandlerCtx, event: DecodedEvent) {
  const goal = await ctx.prisma.goal.findUnique({ where: { goalId: event.goalId! } });
  if (!goal) return;

  await ctx.prisma.goal.update({ where: { id: goal.id }, data: { closed: true, paused: true } });
  await appendHistoryOnce(ctx, goal.id, "deleted", event.data ?? {}, event.ledger, event.txHash);
  await publishToUser(ctx, goal.userId, { type: "GoalDeleted", goalId: goal.id });
}

const GOAL_UPDATED_FIELD_TO_HISTORY_EVENT: Record<string, string> = {
  target: "target_changed",
  deadline: "deadline_extended",
  meta: "metadata_updated",
  paused: "paused",
  resumed: "resumed",
};

const INTEREST_KIND_TO_HISTORY_EVENT: Record<string, string> = {
  accrue: "interest_accrued",
  claim: "interest_claimed",
};

/**
 * Handles every event that reflects a vault-state change:
 * `DepositMade`, `Withdrawal`, `GoalCompleted`, `GoalUpdated`, and
 * `InterestAccrued`. In every case we refresh the Goal row from a live
 * `get_goal` read rather than trusting event data field-by-field.
 *
 * The `goal_history` row's `eventType` is normalized to match exactly what
 * the synchronous prepare/submit path in `goal.service.ts` /
 * `transaction.service.ts` already writes (e.g. both label a claim
 * `"interest_claimed"`, not the raw on-chain event name
 * `"interest_accrued"` for every kind) — otherwise the same action taken
 * through our own API would show up twice in a goal's history once the
 * indexer catches up to it.
 */
export async function handleVaultStateEvent(ctx: HandlerCtx, event: DecodedEvent, rawEventName: string) {
  const goal = await ctx.prisma.goal.findUnique({ where: { goalId: event.goalId! } });
  if (!goal) return;

  await refreshGoalFromChain(ctx, goal.vaultAddress);

  let historyEventType = rawEventName;
  if (rawEventName === "goal_updated") {
    const field = String(event.topics[2] ?? "");
    historyEventType = GOAL_UPDATED_FIELD_TO_HISTORY_EVENT[field] ?? rawEventName;
  } else if (rawEventName === "interest_accrued") {
    const kind = String(event.topics[3] ?? "accrue");
    historyEventType = INTEREST_KIND_TO_HISTORY_EVENT[kind] ?? rawEventName;
  }
  await appendHistoryOnce(ctx, goal.id, historyEventType, event.data ?? {}, event.ledger, event.txHash);

  if (rawEventName === "interest_accrued") {
    const data = event.data as { amount: bigint; total: bigint };
    const kind = String(event.topics[3] ?? "accrue");
    const already = await ctx.prisma.interest.findFirst({ where: { goalId: goal.id, txHash: event.txHash, kind } });
    if (!already) {
      await ctx.prisma.interest.create({
        data: {
          goalId: goal.id,
          kind,
          amount: fromStroops(data.amount),
          totalAfter: fromStroops(data.total),
          ledger: BigInt(event.ledger),
          txHash: event.txHash,
        },
      });
    }
  }

  await publishToUser(ctx, goal.userId, { type: rawEventName, goalId: goal.id });
  
  const achievementService = new AchievementService(ctx.prisma, ctx.redis);
  await achievementService.evaluate(goal.userId);
}
