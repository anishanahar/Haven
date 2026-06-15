/** Stellar/Soroban token amounts use 7 decimal places ("stroops"). */
const DECIMALS = 7;
const SCALE = 10_000_000n;

export function toStroops(amount: number | string): bigint {
  const value = typeof amount === "string" ? amount : amount.toString();
  const [wholePart = "0", frac = ""] = value.split(".");
  const paddedFrac = (frac + "0".repeat(DECIMALS)).slice(0, DECIMALS);
  const sign = wholePart.startsWith("-") ? -1n : 1n;
  const wholeAbs = wholePart.replace("-", "") || "0";
  return sign * (BigInt(wholeAbs) * SCALE + BigInt(paddedFrac || "0"));
}

export function fromStroops(stroops: bigint | string): string {
  const value = typeof stroops === "bigint" ? stroops : BigInt(stroops);
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return `${sign}${whole}${frac ? `.${frac}` : ""}`;
}
