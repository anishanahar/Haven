import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_TESTNET_URL, STELLAR_TESTNET_PASSPHRASE } from "./stellar-wallet";

export async function fetchXlmBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`${HORIZON_TESTNET_URL}/accounts/${address}`);
    if (!response.ok) {
      if (response.status === 404) {
        return "0 XLM (account not funded)";
      }
      throw new Error(`Failed to fetch account: ${response.statusText}`);
    }
    const data = await response.json();
    const nativeBalance = data.balances.find((b: any) => b.asset_type === "native");
    return nativeBalance ? `${nativeBalance.balance} XLM` : "0 XLM";
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Unknown error fetching balance");
  }
}

export async function buildPaymentXdr(from: string, to: string, amount: string): Promise<string> {
  const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET_URL);
  const account = await server.loadAccount(from);

  const fee = await server.fetchBaseFee();

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: fee.toString(),
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: to,
        asset: StellarSdk.Asset.native(),
        amount: amount,
      })
    )
    .setTimeout(30)
    .build();

  return transaction.toXDR();
}

export async function submitSignedTx(signedXdr: string): Promise<{ hash: string }> {
  const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET_URL);
  const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, STELLAR_TESTNET_PASSPHRASE);
  
  try {
    const response = await server.submitTransaction(transaction);
    return { hash: response.hash };
  } catch (error: any) {
    // Attempt to extract Horizon error message
    let errorMessage = "Transaction failed";
    if (error.response && error.response.data && error.response.data.extras && error.response.data.extras.result_codes) {
      errorMessage = `Transaction failed: ${JSON.stringify(error.response.data.extras.result_codes)}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
}
