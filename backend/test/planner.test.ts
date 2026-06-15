import { describe, expect, it } from "vitest";
import { planGoal } from "@/services/planner.service.js";

describe("planGoal", () => {
  it("computes a positive weekly/monthly contribution for a future target", () => {
    const result = planGoal({ targetAmount: 2500, currentSaved: 0, apyBps: 500, months: 12 });
    expect(result.weeklyDeposit).toBeGreaterThan(0);
    expect(result.monthlyDeposit).toBeGreaterThan(0);
    expect(result.remaining).toBe(2500);
    expect(result.chanceOfSuccessPercent).toBeGreaterThanOrEqual(5);
    expect(result.chanceOfSuccessPercent).toBeLessThanOrEqual(98);
  });

  it("requires zero further contribution once the target is already met", () => {
    const result = planGoal({ targetAmount: 1000, currentSaved: 1000, apyBps: 500, months: 6 });
    expect(result.remaining).toBe(0);
    expect(result.weeklyDeposit).toBe(0);
    expect(result.suggestions[0]).toMatch(/already reached/i);
  });

  it("rejects a target date in the past", () => {
    expect(() => planGoal({ targetAmount: 1000, currentSaved: 0, apyBps: 500, targetDate: new Date("2000-01-01") })).toThrow();
  });

  it("rejects when neither targetDate nor months is provided", () => {
    expect(() => planGoal({ targetAmount: 1000, currentSaved: 0, apyBps: 500 })).toThrow();
  });

  it("a longer horizon lowers the required weekly contribution", () => {
    const short = planGoal({ targetAmount: 5000, currentSaved: 0, apyBps: 500, months: 6 });
    const long = planGoal({ targetAmount: 5000, currentSaved: 0, apyBps: 500, months: 24 });
    expect(long.weeklyDeposit).toBeLessThan(short.weeklyDeposit);
  });
});
