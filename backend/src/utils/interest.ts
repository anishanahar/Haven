const BPS_DENOMINATOR = 10_000;
const SECONDS_PER_YEAR = 31_536_000;

/**
 * Mirrors `haven_common::linear_interest` from the Soroban contracts
 * (`contracts/common/src/lib.rs`) exactly, operating on floats since this is
 * used for off-chain projections/estimates (the planner, analytics
 * dashboards) — never for anything that moves funds. The contract itself is
 * always the authority for actual interest paid.
 */
export function linearInterest(principal: number, apyBps: number, elapsedSeconds: number): number {
  if (principal <= 0 || apyBps <= 0 || elapsedSeconds <= 0) return 0;
  return (principal * apyBps * elapsedSeconds) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
}
