import type { Goal } from "@prisma/client";
import { GoalRepository } from "@/repositories/goal.repository.js";
import { TransactionRepository } from "@/repositories/transaction.repository.js";
import { SorobanService } from "@/services/soroban.service.js";
import { ApiError, BadRequest, Forbidden, NotFound } from "@/utils/errors.js";
import { fromStroops, toStroops } from "@/utils/amounts.js";
import { env } from "@/config/env.js";
import type { z } from "zod";
import type { createGoalRequestSchema, patchGoalRequestSchema } from "@/types/schemas.js";

type CreateGoalInput = z.infer<typeof createGoalRequestSchema>;
type PatchGoalInput = z.infer<typeof patchGoalRequestSchema>;

export function toGoalDto(goal: Goal) {
  const target = Number(goal.targetAmount);
  const deposited = Number(goal.depositedAmount);
  const remaining = Math.max(target - deposited, 0);
  const progressPercent = target > 0 ? Math.min((deposited / target) * 100, 100) : deposited > 0 ? 100 : 0;

  return {
    id: goal.id,
    goalId: goal.goalId.toString(),
    vaultAddress: goal.vaultAddress,
    name: goal.name,
    icon: goal.icon,
    template: goal.template,
    targetAmount: target,
    depositedAmount: deposited,
    accruedInterest: Number(goal.accruedInterest),
    claimedInterest: Number(goal.claimedInterest),
    apyBps: goal.apyBps,
    unlockDate: goal.unlockDate.toISOString(),
    savingsFrequency: goal.savingsFrequency,
    completed: goal.completed,
    paused: goal.paused,
    closed: goal.closed,
    progressPercent: Math.round(progressPercent * 100) / 100,
    remaining,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export class GoalService {
  constructor(
    private readonly goals: GoalRepository,
    private readonly transactions: TransactionRepository,
    private readonly soroban: SorobanService,
    private readonly factoryContractId = env.GOAL_FACTORY_CONTRACT_ID,
  ) {}

  async listGoals(userId: string, includeClosed: boolean) {
    const rows = await this.goals.findManyByUser(userId, { includeClosed });
    return rows.map(toGoalDto);
  }

  async getGoal(userId: string, id: string) {
    const goal = await this.assertOwnedGoal(userId, id);
    return toGoalDto(goal);
  }

  async getHistory(userId: string, id: string) {
    const goal = await this.assertOwnedGoal(userId, id);
    return this.goals.historyFor(goal.id);
  }

  /** Builds the unsigned `goal-factory::create_goal` invocation for the wallet to sign. */
  async prepareCreateGoal(ownerPublicKey: string, input: CreateGoalInput) {
    this.requireFactoryConfigured();
    const unlockDateSeconds = Math.floor(input.unlockDate.getTime() / 1000);
    return this.soroban.prepareInvocation(ownerPublicKey, this.factoryContractId, "create_goal", [
      { type: "address", value: ownerPublicKey },
      { type: "string", value: input.name },
      { type: "string", value: input.icon },
      { type: "i128", value: toStroops(input.targetAmount) },
      { type: "u64", value: unlockDateSeconds },
    ]);
  }

  /** Submits a signed `create_goal` invocation and materializes the Goal row from the confirmed on-chain result. */
  async submitCreateGoal(userId: string, signedXdr: string, input: CreateGoalInput) {
    const { hash } = await this.soroban.submit(signedXdr);
    const result = await this.soroban.waitForConfirmation(hash);

    if (result.status !== "SUCCESS") {
      throw new ApiError(422, "TRANSACTION_FAILED", "create_goal transaction did not succeed on-chain", { hash });
    }

    const [onChainGoalId, vaultAddress] = this.soroban.decodeReturnValue<[bigint, string]>(result) ?? [];
    if (onChainGoalId === undefined || !vaultAddress) {
      throw new ApiError(500, "UNEXPECTED_RESULT", "create_goal did not return the expected (goal_id, vault) tuple");
    }

    const goal = await this.goals.create({
      goalId: onChainGoalId,
      vaultAddress,
      user: { connect: { id: userId } },
      name: input.name,
      icon: input.icon,
      template: input.template,
      targetAmount: input.targetAmount,
      unlockDate: input.unlockDate,
      savingsFrequency: input.savingsFrequency,
      apyBps: 500,
    });

    await this.transactions.create({
      goalId: goal.id,
      userId,
      type: "CREATE_GOAL",
      amount: 0,
      status: "SUCCESS",
      txHash: hash,
      ledger: BigInt(result.ledger ?? 0),
    });
    await this.goals.appendHistory(goal.id, {
      eventType: "created",
      payload: { vaultAddress, name: input.name, targetAmount: input.targetAmount },
      ledger: BigInt(result.ledger ?? 0),
      txHash: hash,
    });

    return toGoalDto(goal);
  }

  async preparePatch(userId: string, id: string, ownerPublicKey: string, input: PatchGoalInput) {
    const goal = await this.assertOwnedGoal(userId, id);
    const { method, args, target } = this.resolvePatchInvocation(goal, ownerPublicKey, input);
    return this.soroban.prepareInvocation(ownerPublicKey, target, method, args);
  }

  async submitPatch(userId: string, id: string, signedXdr: string, input: PatchGoalInput) {
    const goal = await this.assertOwnedGoal(userId, id);
    const { hash } = await this.soroban.submit(signedXdr);
    const result = await this.soroban.waitForConfirmation(hash);
    if (result.status !== "SUCCESS") {
      throw new ApiError(422, "TRANSACTION_FAILED", "Update transaction did not succeed on-chain", { hash });
    }

    const data: Record<string, unknown> = {};
    let eventType = "metadata_updated";
    if (input.paused !== undefined) {
      data.paused = input.paused;
      eventType = input.paused ? "paused" : "resumed";
    } else if (input.targetAmount !== undefined) {
      data.targetAmount = input.targetAmount;
      data.completed = Number(goal.depositedAmount) >= input.targetAmount;
      eventType = "target_changed";
    } else if (input.unlockDate !== undefined) {
      data.unlockDate = input.unlockDate;
      eventType = "deadline_extended";
    } else {
      if (input.name !== undefined) data.name = input.name;
      if (input.icon !== undefined) data.icon = input.icon;
    }

    const updated = await this.goals.update(goal.id, data);
    await this.goals.appendHistory(goal.id, {
      eventType,
      payload: data as never,
      ledger: BigInt(result.ledger ?? 0),
      txHash: hash,
    });

    return toGoalDto(updated);
  }

  async prepareDelete(userId: string, id: string, ownerPublicKey: string) {
    this.requireFactoryConfigured();
    const goal = await this.assertOwnedGoal(userId, id);
    return this.soroban.prepareInvocation(ownerPublicKey, this.factoryContractId, "delete_goal", [
      { type: "address", value: ownerPublicKey },
      { type: "u64", value: goal.goalId },
    ]);
  }

  async submitDelete(userId: string, id: string, signedXdr: string) {
    const goal = await this.assertOwnedGoal(userId, id);
    const { hash } = await this.soroban.submit(signedXdr);
    const result = await this.soroban.waitForConfirmation(hash);
    if (result.status !== "SUCCESS") {
      throw new ApiError(422, "TRANSACTION_FAILED", "delete_goal transaction did not succeed on-chain", { hash });
    }

    const updated = await this.goals.update(goal.id, { closed: true, paused: true });
    await this.transactions.create({
      goalId: goal.id,
      userId,
      type: "DELETE_GOAL",
      amount: fromStroops(0n),
      status: "SUCCESS",
      txHash: hash,
      ledger: BigInt(result.ledger ?? 0),
    });
    await this.goals.appendHistory(goal.id, {
      eventType: "deleted",
      payload: {},
      ledger: BigInt(result.ledger ?? 0),
      txHash: hash,
    });

    return toGoalDto(updated);
  }

  private resolvePatchInvocation(goal: Goal, ownerPublicKey: string, input: PatchGoalInput) {
    if (input.paused !== undefined) {
      return { method: input.paused ? "pause" : "resume", args: [], target: goal.vaultAddress };
    }
    if (input.targetAmount !== undefined) {
      return {
        method: "change_target",
        args: [{ type: "i128" as const, value: toStroops(input.targetAmount) }],
        target: goal.vaultAddress,
      };
    }
    if (input.unlockDate !== undefined) {
      return {
        method: "extend_deadline",
        args: [{ type: "u64" as const, value: Math.floor(input.unlockDate.getTime() / 1000) }],
        target: goal.vaultAddress,
      };
    }
    if (input.name !== undefined || input.icon !== undefined) {
      this.requireFactoryConfigured();
      return {
        method: "update_goal",
        args: [
          { type: "address" as const, value: ownerPublicKey },
          { type: "u64" as const, value: goal.goalId },
          { type: "option-string" as const, value: input.name ?? null },
          { type: "option-string" as const, value: input.icon ?? null },
        ],
        target: this.factoryContractId,
      };
    }
    throw BadRequest("PATCH /goal/:id requires exactly one of: paused, targetAmount, unlockDate, name/icon");
  }

  private async assertOwnedGoal(userId: string, id: string) {
    const goal = await this.goals.findById(id);
    if (!goal) throw NotFound("Goal");
    if (goal.userId !== userId) throw Forbidden();
    return goal;
  }

  private requireFactoryConfigured() {
    if (!this.factoryContractId) {
      throw new ApiError(503, "CONTRACTS_NOT_CONFIGURED", "GOAL_FACTORY_CONTRACT_ID is not configured");
    }
  }
}
