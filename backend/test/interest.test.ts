import { describe, expect, it } from "vitest";
import { linearInterest } from "@/utils/interest.js";

const YEAR = 31_536_000;

describe("linearInterest", () => {
  it("matches the contract formula at 6 months and 1 year (5% APY)", () => {
    expect(linearInterest(100, 500, YEAR / 2)).toBeCloseTo(2.5, 6);
    expect(linearInterest(100, 500, YEAR)).toBeCloseTo(5, 6);
  });

  it("is zero for non-positive principal, APY, or elapsed time", () => {
    expect(linearInterest(0, 500, YEAR)).toBe(0);
    expect(linearInterest(-100, 500, YEAR)).toBe(0);
    expect(linearInterest(100, 0, YEAR)).toBe(0);
    expect(linearInterest(100, 500, 0)).toBe(0);
  });

  it("scales linearly with elapsed time", () => {
    const quarter = linearInterest(1000, 500, YEAR / 4);
    const half = linearInterest(1000, 500, YEAR / 2);
    expect(half).toBeCloseTo(quarter * 2, 6);
  });
});
