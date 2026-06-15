import { linearInterest } from "@/utils/interest.js";
import { BadRequest } from "@/utils/errors.js";

export interface PlannerInput {
  targetAmount: number;
  currentSaved: number;
  apyBps: number;
  targetDate?: Date;
  months?: number;
}

export interface PlannerResult {
  remaining: number;
  monthsRemaining: number;
  weeksRemaining: number;
  weeklyDeposit: number;
  monthlyDeposit: number;
  projectedInterest: number;
  chanceOfSuccessPercent: number;
  expectedCompletionDate: string;
  suggestions: string[];
}

/**
 * "AI Goal Planner" — despite the product-facing name, this is entirely
 * deterministic arithmetic (no model call, no external API): given a
 * target, a deadline (explicit date or a month count), current savings,
 * and the vault's APY, it solves for the required contribution cadence and
 * produces a few explainable, formula-driven suggestions.
 */
export function planGoal(input: PlannerInput): PlannerResult {
  const now = new Date();
  let targetDate: Date;
  if (input.targetDate) {
    targetDate = input.targetDate;
  } else if (input.months) {
    targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() + input.months);
  } else {
    throw BadRequest("Provide either targetDate or months");
  }

  const msRemaining = targetDate.getTime() - now.getTime();
  if (msRemaining <= 0) {
    throw BadRequest("targetDate must be in the future");
  }

  const daysRemaining = msRemaining / 86_400_000;
  const weeksRemaining = Math.max(daysRemaining / 7, 1 / 7);
  const monthsRemaining = Math.max(daysRemaining / 30.44, 1 / 30.44);

  const remaining = Math.max(input.targetAmount - input.currentSaved, 0);

  // Estimate interest earned over the period assuming a roughly linear
  // ramp-up of principal (average balance ~= (current + target) / 2), then
  // let that estimated interest offset how much the user needs to deposit.
  const averageBalance = (input.currentSaved + input.targetAmount) / 2;
  const projectedInterest = linearInterest(averageBalance, input.apyBps, Math.round(daysRemaining * 86_400));
  const contributionNeeded = Math.max(remaining - projectedInterest, 0);

  const weeklyDeposit = contributionNeeded / weeksRemaining;
  const monthlyDeposit = contributionNeeded / monthsRemaining;

  // Deterministic "chance of success" proxy: goals requiring a smaller bite
  // out of the target per month are scored as more achievable. This is a
  // heuristic, not a statistical model — it has no data about the user's
  // income, so it's explicitly a pacing-difficulty score, documented as such
  // in docs/api.md.
  const monthlyBiteRatio = input.targetAmount > 0 ? monthlyDeposit / input.targetAmount : 0;
  const chanceOfSuccessPercent = Math.round(Math.max(5, Math.min(98, 100 - monthlyBiteRatio * 220)));

  const suggestions: string[] = [];
  if (remaining <= 0) {
    suggestions.push("You've already reached this target — consider claiming interest or setting a new goal.");
  } else {
    suggestions.push(
      `Saving ${formatMoney(weeklyDeposit)} per week gets you to ${formatMoney(input.targetAmount)} by ${targetDate.toDateString()}.`,
    );
    if (projectedInterest > 0) {
      suggestions.push(
        `At the current ${(input.apyBps / 100).toFixed(2)}% APY, you're projected to earn about ${formatMoney(projectedInterest)} in interest along the way.`,
      );
    }
    if (chanceOfSuccessPercent < 40) {
      const extendedMonths = Math.ceil(monthsRemaining * 1.5);
      suggestions.push(
        `This pace is aggressive. Extending your deadline to ~${extendedMonths} months would lower your monthly contribution to roughly ${formatMoney(contributionNeeded / extendedMonths)}.`,
      );
    } else if (chanceOfSuccessPercent > 80) {
      suggestions.push("This is a comfortable pace — you could even reach this goal early by rounding up deposits.");
    }
  }

  return {
    remaining,
    monthsRemaining: Math.round(monthsRemaining * 100) / 100,
    weeksRemaining: Math.round(weeksRemaining * 100) / 100,
    weeklyDeposit: Math.round(weeklyDeposit * 100) / 100,
    monthlyDeposit: Math.round(monthlyDeposit * 100) / 100,
    projectedInterest: Math.round(projectedInterest * 100) / 100,
    chanceOfSuccessPercent,
    expectedCompletionDate: targetDate.toISOString(),
    suggestions,
  };
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
