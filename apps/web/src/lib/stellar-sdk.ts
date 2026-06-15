import * as StellarSdk from "@stellar/stellar-sdk";
import { STELLAR_TESTNET_PASSPHRASE, HORIZON_TESTNET_URL } from "./stellar-wallet";

const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET_URL);

export async function fetchXlmBalance(address: string): Promise<string> {
  try {
    const account = await server.loadAccount(address);
    const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
    return nativeBalance ? nativeBalance.balance : "0";
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      throw new Error("404");
    }
    console.error("Error fetching balance:", err);
    throw new Error(err.message || "Failed to fetch balance");
  }
}

export async function buildPaymentXdr(from: string, to: string, amount: string): Promise<string> {
  try {
    const account = await server.loadAccount(from);
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
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
  } catch (err: any) {
    console.error("Error building transaction:", err);
    throw new Error(err.message || "Failed to build transaction");
  }
}

export async function submitSignedTx(signedXdr: string): Promise<{ hash: string }> {
  try {
    const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, STELLAR_TESTNET_PASSPHRASE);
    const response = await server.submitTransaction(transaction);
    return { hash: response.hash };
  } catch (err: any) {
    console.error("Error submitting transaction:", err);
    let errorMsg = err.message || "Failed to submit transaction";
    if (err.response && err.response.data && err.response.data.extras && err.response.data.extras.result_codes) {
      errorMsg = `Transaction failed: ${err.response.data.extras.result_codes.transaction} - ${JSON.stringify(err.response.data.extras.result_codes.operations)}`;
    }
    throw new Error(errorMsg);
  }
}
