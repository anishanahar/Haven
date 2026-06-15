import "@/utils/bigint-json.js";

import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { rpc } from "@stellar/stellar-sdk";
import pino from "pino";
import { env } from "@/config/env.js";
import { getCursor, setCursor } from "@/indexer/cursor.js";
import { buildHandlerCtx, decodeEvent, handleGoalCreated, handleGoalDeleted, handleVaultStateEvent } from "@/indexer/handlers.js";

const log = pino({ level: env.LOG_LEVEL, transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined });

const VAULT_STATE_EVENTS = new Set(["deposit_made", "withdrawal", "goal_completed", "goal_updated", "interest_accrued"]);
const MAX_CONTRACT_IDS_PER_FILTER = 5; // Soroban RPC's getEvents filter cap.

async function main() {
  const prisma = new PrismaClient();
  const redis = new Redis(env.REDIS_URL);
  const server = new rpc.Server(env.SOROBAN_RPC_URL, { allowHttp: env.SOROBAN_RPC_URL.startsWith("http://") });
  const ctx = buildHandlerCtx(prisma, redis);

  const knownVaults = new Set<string>((await prisma.goal.findMany({ select: { vaultAddress: true } })).map((g) => g.vaultAddress));
  log.info({ count: knownVaults.size }, "indexer: seeded known vault addresses");

  let cursorLedger = await getCursor(prisma);
  if (cursorLedger === 0) {
    const latest = await server.getLatestLedger();
    cursorLedger = env.INDEXER_START_LEDGER || Math.max(latest.sequence - 1000, 1);
    log.info({ cursorLedger }, "indexer: no stored cursor, starting near chain tip");
  }

  log.info({ cursorLedger }, "indexer: starting poll loop");

  for (;;) {
    try {
      cursorLedger = await pollOnce(ctx, server, cursorLedger, knownVaults, log);
      await setCursor(prisma, cursorLedger);
    } catch (err) {
      log.error({ err }, "indexer: poll cycle failed");
    }
    await sleep(env.INDEXER_POLL_INTERVAL_MS);
  }
}

async function pollOnce(
  ctx: ReturnType<typeof buildHandlerCtx>,
  server: rpc.Server,
  fromLedger: number,
  knownVaults: Set<string>,
  log: pino.Logger,
): Promise<number> {
  const latest = await server.getLatestLedger();
  if (fromLedger >= latest.sequence) return fromLedger;

  const contractGroups = chunk(
    [env.GOAL_FACTORY_CONTRACT_ID, env.TREASURY_CONTRACT_ID, ...knownVaults].filter(Boolean),
    MAX_CONTRACT_IDS_PER_FILTER,
  );

  let maxLedgerSeen = fromLedger;

  for (const contractIds of contractGroups) {
    if (contractIds.length === 0) continue;

    let cursor: string | undefined;
    for (;;) {
      const request: import("@stellar/stellar-sdk").rpc.Api.GetEventsRequest = cursor
        ? { filters: [{ type: "contract", contractIds }], cursor, limit: 100 }
        : { filters: [{ type: "contract", contractIds }], startLedger: fromLedger + 1, limit: 100 };

      const response = await server.getEvents(request);
      for (const rawEvent of response.events) {
        const decoded = decodeEvent(rawEvent);
        await dispatch(ctx, decoded, log);
        maxLedgerSeen = Math.max(maxLedgerSeen, decoded.ledger);

        // A freshly discovered vault must be indexed on subsequent cycles too.
        if (decoded.name === "goal_created" && decoded.data && typeof decoded.data.vault === "string") {
          knownVaults.add(decoded.data.vault);
        }
      }

      if (response.events.length < 100) break;
      cursor = response.cursor;
    }
  }

  return Math.max(maxLedgerSeen, fromLedger);
}

async function dispatch(ctx: ReturnType<typeof buildHandlerCtx>, event: ReturnType<typeof decodeEvent>, log: pino.Logger) {
  try {
    switch (event.name) {
      case "goal_created":
        await handleGoalCreated(ctx, event);
        break;
      case "goal_deleted":
        await handleGoalDeleted(ctx, event);
        break;
      default:
        if (VAULT_STATE_EVENTS.has(event.name)) {
          await handleVaultStateEvent(ctx, event, event.name);
        }
    }
  } catch (err) {
    log.error({ err, event: event.name, txHash: event.txHash }, "indexer: failed to process event");
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length > 0 ? out : [[]];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  log.error({ err }, "indexer: fatal error");
  process.exit(1);
});
