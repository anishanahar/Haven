import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";

export async function detectFreighter(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  let allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await requestAccess();
    allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) {
      throw new Error("User denied Freighter access");
    }
  }
  
  const result = await getAddress();
  if (result.error || !result.address) {
    throw new Error(result.error || "Could not get address from Freighter");
  }
  return result.address;
}

export async function getWalletAddress(): Promise<string | null> {
  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) return null;
  const result = await getAddress();
  return result.address || null;
}

export async function signTx(xdr: string): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  });
  if (result.error) {
    throw new Error(result.error);
  }
  return result.signedTxXdr;
}
