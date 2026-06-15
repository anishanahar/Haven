import { isConnected, isAllowed, requestAccess, getAddress, signTransaction } from "@stellar/freighter-api";

export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";

export async function detectFreighter(): Promise<boolean> {
  try {
    const res = await isConnected();
    return res.isConnected;
  } catch (err) {
    console.error("Error detecting Freighter:", err);
    return false;
  }
}

export async function connectWallet(): Promise<string> {
  try {
    const allowedRes = await isAllowed();
    if (!allowedRes.isAllowed) {
      await requestAccess();
    }
    const addressRes = await getAddress();
    if (addressRes.error || !addressRes.address) {
      throw new Error(addressRes.error || "No address returned from Freighter.");
    }
    return addressRes.address;
  } catch (err) {
    console.error("Error connecting wallet:", err);
    throw new Error(err instanceof Error ? err.message : "Failed to connect to Freighter");
  }
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const allowedRes = await isAllowed();
    if (!allowedRes.isAllowed) return null;
    const addressRes = await getAddress();
    return addressRes.address || null;
  } catch (err) {
    console.error("Error getting wallet address:", err);
    return null;
  }
}

export async function signTx(xdr: string): Promise<string> {
  try {
    const signedRes = await signTransaction(xdr, { networkPassphrase: STELLAR_TESTNET_PASSPHRASE });
    if (signedRes.error) {
      throw new Error(signedRes.error as string);
    }
    return signedRes.signedTxXdr;
  } catch (err) {
    console.error("Error signing transaction:", err);
    throw new Error(err instanceof Error ? err.message : "Failed to sign transaction");
  }
}
