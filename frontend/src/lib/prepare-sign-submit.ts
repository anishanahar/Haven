import { signXdr } from "@/lib/wallet-kit";
import type { ConfirmedGoal, PreparedInvocation } from "@/types/api";

/**
 * Drives the backend's "prepare / submit" dual-mode endpoints (see
 * docs/api.md): call once with no `signedXdr` to get an unsigned
 * invocation, sign it with the connected wallet, then call again with the
 * signed XDR to submit and get the confirmed on-chain result.
 */
export async function prepareSignSubmit(
  address: string,
  call: (signedXdr?: string) => Promise<PreparedInvocation | ConfirmedGoal>,
) {
  const prepared = await call();
  if (prepared.status !== "PREPARED") {
    throw new Error("Expected a PREPARED response from the server");
  }
  const signedXdr = await signXdr(prepared.xdr, address);
  const confirmed = await call(signedXdr);
  if (confirmed.status !== "CONFIRMED") {
    throw new Error("Expected a CONFIRMED response from the server");
  }
  return confirmed.goal;
}
