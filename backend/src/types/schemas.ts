import { z } from "zod";

export const goalTemplateSchema = z.enum([
  "LAPTOP",
  "COLLEGE_FEES",
  "VACATION",
  "EMERGENCY_FUND",
  "HOUSE_DOWN_PAYMENT",
  "WEDDING",
  "CUSTOM",
]);

export const savingsFrequencySchema = z.enum(["ONE_TIME", "WEEKLY", "MONTHLY", "MANUAL"]);

export const stellarPublicKeySchema = z.string().regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar public key");

export const authChallengeRequestSchema = z.object({
  publicKey: stellarPublicKeySchema,
});

export const authVerifyRequestSchema = z.object({
  publicKey: stellarPublicKeySchema,
  nonce: z.string().min(1),
  signedChallengeXdr: z.string().min(1),
});

export const createGoalRequestSchema = z.object({
  name: z.string().min(1).max(64),
  icon: z.string().min(1).max(32),
  template: goalTemplateSchema.default("CUSTOM"),
  targetAmount: z.number().positive(),
  unlockDate: z.coerce.date(),
  savingsFrequency: savingsFrequencySchema.default("MANUAL"),
  signedXdr: z.string().min(1).optional(),
});

export const patchGoalRequestSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  icon: z.string().min(1).max(32).optional(),
  targetAmount: z.number().positive().optional(),
  unlockDate: z.coerce.date().optional(),
  paused: z.boolean().optional(),
  signedXdr: z.string().min(1).optional(),
});

export const deleteGoalRequestSchema = z.object({
  signedXdr: z.string().min(1).optional(),
});

export const depositRequestSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.number().positive(),
  signedXdr: z.string().min(1).optional(),
});

export const withdrawRequestSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.number().positive(),
  signedXdr: z.string().min(1).optional(),
});

export const claimRequestSchema = z.object({
  goalId: z.string().uuid(),
  signedXdr: z.string().min(1).optional(),
});

export const plannerRequestSchema = z.object({
  targetAmount: z.number().positive(),
  targetDate: z.coerce.date().optional(),
  months: z.number().int().positive().max(600).optional(),
  currentSaved: z.number().min(0).default(0),
  apyBps: z.number().int().min(0).max(10_000).default(500),
});

export const transactionsQuerySchema = z.object({
  goalId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});
