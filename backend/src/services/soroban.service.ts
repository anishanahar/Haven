import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";
import { env } from "@/config/env.js";

export type ScValArg = { type: "address"; value: string } | { type: "u64"; value: bigint | number } | {
  type: "i128";
  value: bigint | number;
} | { type: "u32"; value: number } | { type: "string"; value: string } | { type: "bool"; value: boolean } | {
  type: "option-string";
  value: string | null;
};

function toScVal(arg: ScValArg): xdr.ScVal {
  switch (arg.type) {
    case "address":
      return new Address(arg.value).toScVal();
    case "u64":
      return nativeToScVal(BigInt(arg.value), { type: "u64" });
    case "i128":
      return nativeToScVal(BigInt(arg.value), { type: "i128" });
    case "u32":
      return nativeToScVal(arg.value, { type: "u32" });
    case "string":
      return nativeToScVal(arg.value, { type: "string" });
    case "bool":
      return nativeToScVal(arg.value);
    case "option-string":
      return arg.value === null ? xdr.ScVal.scvVoid() : nativeToScVal(arg.value, { type: "string" });
  }
}

export interface PreparedInvocation {
  xdr: string;
  simulatedCost: {
    minResourceFee: string;
  };
}

/**
 * Thin wrapper around the Soroban RPC client. The backend never signs a
 * user-funds transaction — it only ever (a) simulates + assembles an
 * unsigned invocation for the frontend/wallet to sign, or (b) relays an
 * already-signed transaction to the network. The one exception is SEP-10
 * challenge signing, which uses a dedicated server keypair that holds no
 * funds and is never used for contract invocations.
 */
export class SorobanService {
  readonly server: rpc.Server;
  readonly networkPassphrase: string;

  constructor(rpcUrl = env.SOROBAN_RPC_URL, networkPassphrase = env.STELLAR_NETWORK_PASSPHRASE) {
    this.server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
    this.networkPassphrase = networkPassphrase;
  }

  /** Builds, simulates, and fee/resource-assembles an unsigned invocation. */
  async prepareInvocation(
    sourcePublicKey: string,
    contractId: string,
    method: string,
    args: ScValArg[],
  ): Promise<PreparedInvocation> {
    const account = await this.server.getAccount(sourcePublicKey);
    const contract = new Contract(contractId);
    const scArgs = args.map(toScVal);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(120)
      .build();

    const simulation = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    const prepared = rpc.assembleTransaction(tx, simulation).build();

    return {
      xdr: prepared.toXDR(),
      simulatedCost: {
        minResourceFee: String(simulation.minResourceFee ?? "0"),
      },
    };
  }

  /** Read-only contract call, no transaction/signature required. */
  async simulateRead<T = unknown>(
    contractId: string,
    method: string,
    args: ScValArg[],
    sourcePublicKey?: string,
  ): Promise<T> {
    // A throwaway, unfunded account is fine as the transaction source for a
    // read-only simulation — Soroban doesn't require it to exist on-chain.
    const source = sourcePublicKey ?? Keypair.random().publicKey();
    const account = await this.server.getAccount(source).catch(() => new Account(source, "0"));
    const contract = new Contract(contractId);
    const scArgs = args.map(toScVal);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(30)
      .build();

    const simulation = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }
    if (!simulation.result?.retval) {
      throw new Error("Simulation returned no result");
    }
    return scValToNative(simulation.result.retval) as T;
  }

  /** Submits an already-signed transaction envelope (base64 XDR). */
  async submit(signedXdr: string): Promise<{ status: string; hash: string }> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase) as Transaction;
    const response = await this.server.sendTransaction(tx);
    if (response.status === "ERROR") {
      throw new Error(`Transaction submission failed: ${JSON.stringify(response.errorResult)}`);
    }
    return { status: response.status, hash: response.hash };
  }

  async getTransaction(hash: string) {
    return this.server.getTransaction(hash);
  }

  /**
   * Polls `getTransaction` until it leaves the NOT_FOUND state or the
   * timeout elapses. Used right after `submit` so a request can return the
   * confirmed result (and, for invocations with a return value, the decoded
   * return) instead of leaving the caller to poll `GET /transactions`
   * themselves. The indexer is still the durable reconciliation path if a
   * request times out before confirmation lands.
   */
  async waitForConfirmation(
    hash: string,
    opts: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<rpc.Api.GetSuccessfulTransactionResponse | rpc.Api.GetFailedTransactionResponse> {
    const timeoutMs = opts.timeoutMs ?? 20_000;
    const intervalMs = opts.intervalMs ?? 1_500;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const result = await this.server.getTransaction(hash);
      if (result.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
        return result;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for transaction ${hash} to confirm`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /** Decodes the return value of a successful invocation, if any. */
  decodeReturnValue<T = unknown>(result: rpc.Api.GetSuccessfulTransactionResponse): T | undefined {
    if (!result.returnValue) return undefined;
    return scValToNative(result.returnValue) as T;
  }

  async getLatestLedger(): Promise<number> {
    const resp = await this.server.getLatestLedger();
    return resp.sequence;
  }
}

export const sorobanService = new SorobanService();
