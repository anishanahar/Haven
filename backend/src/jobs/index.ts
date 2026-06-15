import "@/utils/bigint-json.js";

import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import pino from "pino";
import { env } from "@/config/env.js";
import { runDailySnapshot } from "@/jobs/dailySnapshot.js";
import { runDeadlineReminders } from "@/jobs/deadlineReminders.js";

const log = pino({ level: env.LOG_LEVEL, transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined });
const prisma = new PrismaClient();

// 00:05 UTC daily — analytics snapshot for trend charts.
cron.schedule("5 0 * * *", () => {
  runDailySnapshot(prisma, log).catch((err) => log.error({ err }, "jobs: daily snapshot failed"));
});

// Every 6 hours — deadline-approaching reminders (idempotent per goal per day).
cron.schedule("0 */6 * * *", () => {
  runDeadlineReminders(prisma, log).catch((err) => log.error({ err }, "jobs: deadline reminders failed"));
});

log.info("jobs: scheduler started (daily snapshot @ 00:05 UTC, deadline reminders every 6h)");

// Run once immediately on boot so a fresh deployment doesn't wait for the first cron tick.
runDailySnapshot(prisma, log).catch((err) => log.error({ err }, "jobs: initial daily snapshot failed"));
runDeadlineReminders(prisma, log).catch((err) => log.error({ err }, "jobs: initial deadline reminders failed"));
