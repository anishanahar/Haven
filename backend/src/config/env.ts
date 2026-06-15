import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SEP10_CHALLENGE_TTL_SECONDS: z.coerce.number().default(300),

  STELLAR_NETWORK: z.enum(["TESTNET", "PUBLIC", "FUTURENET"]).default("TESTNET"),
  SOROBAN_RPC_URL: z.string().url(),
  HORIZON_URL: z.string().url(),
  STELLAR_NETWORK_PASSPHRASE: z.string().min(1),
  SEP10_SERVER_SECRET: z.string().optional().default(""),
  HOME_DOMAIN: z.string().default("localhost:3000"),
  WEB_AUTH_DOMAIN: z.string().default("localhost:4000"),

  GOAL_FACTORY_CONTRACT_ID: z.string().optional().default(""),
  TREASURY_CONTRACT_ID: z.string().optional().default(""),
  MOCK_STRATEGY_CONTRACT_ID: z.string().optional().default(""),
  USDC_TOKEN_CONTRACT_ID: z.string().optional().default(""),

  INDEXER_POLL_INTERVAL_MS: z.coerce.number().default(3000),
  INDEXER_START_LEDGER: z.coerce.number().default(0),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
