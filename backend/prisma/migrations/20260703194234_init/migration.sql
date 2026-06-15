-- CreateEnum
CREATE TYPE "goal_template" AS ENUM ('LAPTOP', 'COLLEGE_FEES', 'VACATION', 'EMERGENCY_FUND', 'HOUSE_DOWN_PAYMENT', 'WEDDING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "savings_frequency" AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'CLAIM_INTEREST', 'CREATE_GOAL', 'DELETE_GOAL');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('DEPOSIT_SUCCESS', 'GOAL_COMPLETED', 'WEEKLY_REMINDER', 'INTEREST_UPDATED', 'DEADLINE_APPROACHING', 'TARGET_REACHED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT,
    "avatar_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "network" TEXT NOT NULL DEFAULT 'testnet',
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "challenge_xdr" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "goal_id" BIGINT NOT NULL,
    "vault_address" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "template" "goal_template" NOT NULL DEFAULT 'CUSTOM',
    "target_amount" DECIMAL(20,7) NOT NULL,
    "deposited_amount" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "accrued_interest" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "claimed_interest" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "apy_bps" INTEGER NOT NULL DEFAULT 500,
    "unlock_date" TIMESTAMP(3) NOT NULL,
    "savings_frequency" "savings_frequency" NOT NULL DEFAULT 'MANUAL',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_history" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "ledger" BIGINT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "transaction_type" NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(20,7) NOT NULL,
    "tx_hash" TEXT,
    "ledger" BIGINT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL(20,7) NOT NULL,
    "total_after" DECIMAL(20,7) NOT NULL,
    "ledger" BIGINT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "goal_id" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_saved" DECIMAL(20,7) NOT NULL,
    "total_interest" DECIMAL(20,7) NOT NULL,
    "active_goals" INTEGER NOT NULL,
    "completed_goals" INTEGER NOT NULL,
    "deposit_count" INTEGER NOT NULL,
    "deposit_total" DECIMAL(20,7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_cursor" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "last_ledger" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indexer_cursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_public_key_key" ON "users"("public_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_public_key_key" ON "wallets"("public_key");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_challenges_nonce_key" ON "auth_challenges"("nonce");

-- CreateIndex
CREATE INDEX "auth_challenges_public_key_idx" ON "auth_challenges"("public_key");

-- CreateIndex
CREATE UNIQUE INDEX "goals_goal_id_key" ON "goals"("goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "goals_vault_address_key" ON "goals"("vault_address");

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- CreateIndex
CREATE INDEX "goals_user_id_closed_idx" ON "goals"("user_id", "closed");

-- CreateIndex
CREATE INDEX "goal_history_goal_id_idx" ON "goal_history"("goal_id");

-- CreateIndex
CREATE INDEX "goal_history_ledger_idx" ON "goal_history"("ledger");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tx_hash_key" ON "transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "transactions_goal_id_idx" ON "transactions"("goal_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "interest_goal_id_idx" ON "interest"("goal_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "analytics_snapshots_user_id_idx" ON "analytics_snapshots"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_user_id_date_key" ON "analytics_snapshots"("user_id", "date");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_history" ADD CONSTRAINT "goal_history_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest" ADD CONSTRAINT "interest_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
