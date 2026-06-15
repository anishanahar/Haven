import { GoalRepository } from "@/repositories/goal.repository.js";
import { TransactionRepository } from "@/repositories/transaction.repository.js";
import { InterestRepository } from "@/repositories/interest.repository.js";
import { NotificationRepository } from "@/repositories/notification.repository.js";
import { SorobanService } from "@/services/soroban.service.js";
import { toGoalDto } from "@/services/goal.service.js";
import { ApiError, Forbidden, NotFound } from "@/utils/errors.js";
import { fromStroops, toStroops } from "@/utils/amounts.js";

export class TransactionService {
  constructor(
    private readonly goals: GoalRepository,
    private readonly transactions: TransactionRepository,
    private readonly interest: InterestRepository,
    private readonly notifications: NotificationRepository,
    private readonly soroban: SorobanService,
  ) {}

  async prepareDeposit(userId: string, ownerPublicKey: string, goalDbId: string, amount: number) {
    const goal = await this.assertOwnedOpenGoal(userId, goalDbId);
    return this.soroban.prepareInvocation(ownerPublicKey, goal.vaultAddress, "deposit", [
      { type: "i128", value: toStroops(amount) },
    ]);
  }

  async submitDeposit(userId: string, goalDbId: string, amount: number, signedXdr: string) {
    const goal = await this.assertOwnedOpenGoal(userId, goalDbId);
    const { hash } = await this.soroban.submit(signedXdr);
    const result = await this.soroban.waitForConfirmation(hash);
    if (result.status !== "SUCCESS") {
      throw new ApiError(422, "TRANSACTION_FAILED", "Deposit did not succeed on-chain", { hash });
    }

    const newTotal = this.soroban.decodeReturnValue<bigint>(result) ?? 0n;
    const targetReached = newTotal >= toStroops(Number(goal.targetAmount));

    const updated = await this.goals.update(goal.id, {
      depositedAmount: fromStroops(newTotal),
      completed: targetReached,
    });
    await this.transactions.create({
      goalId: goal.id,
      userId,
      type: "DEPOSIT",
      amount,
      status: "SUCCESS",
      txHash: hash,
      ledger: BigInt(result.ledger ?? 0),
    });
    await this.goals.appendHistory(goal.id, {
      eventType: "deposit_made",
      payload: { amount, totalDeposited: fromStroops(newTotal) },
      ledger: BigInt(result.ledger ?? 0),
      txHash: hash,
    });
    await this.notifications.create({
      userId,
      type: "DEPOSIT_SUCCESS",
      title: "Deposit successful",
      body: `You added ${amount} to "${goal.name}".`,
      goalId: goal.id,
    });
    if (targetReached && !goal.completed) {
      await this.notifications.create({
        userId,
        type: "TARGET_REACHED",
        title: "Goal target reached!",
        body: `"${goal.name}" has hit its savings target.`,
        goalId: goal.id,
      });
    }

    return toGoalDto(updated);
  }

  async prepareWithdraw(userId: string, ownerPublicKey: string, goalDbId: string, amount: number) {
    const goal = await this.assertOwnedOpenGoal(userId, goalDbId);
    return this.soroban.prepareInvocation(ownerPublicKey, goal.vaultAddress, "withdraw", [
      { type: "i128", value: toStroops(amount) },
    ]);
  }

  async submitWithdraw(userId: string, goalDbId: string, amount: number, signedXdr: string) {
    const goal = await this.assertOwnedOpenGoal(userId, goalDbId);
    const { hash } = await this.soroban.submit(signedXdr);
    const result = await this.soroban.waitForConfirmation(hash);
    if (result.status !== "SUCCESS") {
      throw new ApiError(422, "TRANSACTION_FAILED", "Withdrawal did not succeed on-chain", { hash });
    }

    const remaining = this.soroban.decodeReturnValue<bigint>(result) ?? 0n;
    const stillCompleted = remaining >= toStroops(Number(goal.targetAmount));

    const updated = await this.goals.update(goal.id, {
      depositedAmount: fromStroops(remaining),
      completed: stillCompleted,
    });
    await this.transactions.create({
      goalId: goal.id,
      userId,
      type: "WITHDRAWAL",
      amount,
      status: "SUCCESS",
      txHash: hash,
      ledger: BigInt(result.ledger ?? 0),
    });
    await this.goals.appendHistory(goal.id, {
      eventType: "withdrawal",
      payload: { amount, remaining: fromStroops(remaining) },
      ledger: BigInt(result.ledger ?? 0),
      txHash: hash,
    });

    return toGoalDto(updated);
  }

  async prepareClaim(userId: string, ownerPublicKey: string, goalDbId: string) {
    const goal = await this.assertOwnedOpenGoal(userId, goalDbId);
    return this.soroban.prepareInvocation(ownerPublicKey, goal.vaultAddress, "claim", []);
  }

  async submitClaim(userId: string, goalDbId: string, signedXdr: string) {
    const goal = await this.assertOwnedOpenGoal(userId, goalDbId);
    const { hash } = await this.soroban.submit(signedXdr);
    const result = await this.soroban.waitForConfirmation(hash);
    if (result.status !== "SUCCESS") {
      throw new ApiError(422, "TRANSACTION_FAILED", "Claim did not succeed on-chain", { hash });
    }

    const paid = this.soroban.decodeReturnValue<bigint>(result) ?? 0n;
    const paidDecimal = fromStroops(paid);
    const newClaimedTotal = (Number(goal.claimedInterest) + Number(paidDecimal)).toString();

    const updated = await this.goals.update(goal.id, {
      claimedInterest: newClaimedTotal,
      accruedInterest: "0",
    });
    await this.transactions.create({
      goalId: goal.id,
      userId,
      type: "CLAIM_INTEREST",
      amount: paidDecimal,
      status: "SUCCESS",
      txHash: hash,
      ledger: BigInt(result.ledger ?? 0),
    });
    await this.interest.create({
      goalId: goal.id,
      kind: "claim",
      amount: paidDecimal,
      totalAfter: newClaimedTotal,
      ledger: BigInt(result.ledger ?? 0),
      txHash: hash,
    });
    await this.goals.appendHistory(goal.id, {
      eventType: "interest_claimed",
      payload: { amount: paidDecimal, totalClaimed: newClaimedTotal },
      ledger: BigInt(result.ledger ?? 0),
      txHash: hash,
    });
    await this.notifications.create({
      userId,
      type: "INTEREST_UPDATED",
      title: "Interest claimed",
      body: `You claimed ${paidDecimal} in interest from "${goal.name}".`,
      goalId: goal.id,
    });

    return toGoalDto(updated);
  }

  private async assertOwnedOpenGoal(userId: string, id: string) {
    const goal = await this.goals.findById(id);
    if (!goal) throw NotFound("Goal");
    if (goal.userId !== userId) throw Forbidden();
    if (goal.closed) throw new ApiError(409, "GOAL_CLOSED", "This goal has been closed");
    return goal;
  }
}
