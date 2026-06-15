import { describe, expect, it } from "vitest";
import { fromStroops, toStroops } from "@/utils/amounts.js";

describe("toStroops / fromStroops", () => {
  it("round-trips whole numbers", () => {
    expect(toStroops(100)).toBe(1_000_000_000n);
    expect(fromStroops(1_000_000_000n)).toBe("100");
  });

  it("round-trips decimals", () => {
    expect(toStroops("2500.5")).toBe(25_005_000_000n);
    expect(fromStroops(25_005_000_000n)).toBe("2500.5");
  });

  it("handles zero", () => {
    expect(toStroops(0)).toBe(0n);
    expect(fromStroops(0n)).toBe("0");
  });

  it("handles negative amounts", () => {
    expect(toStroops(-42.5)).toBe(-425_000_000n);
    expect(fromStroops(-425_000_000n)).toBe("-42.5");
  });

  it("truncates beyond 7 decimal places rather than rounding", () => {
    expect(toStroops("1.123456789")).toBe(11_234_567n);
  });
});
