import { Keypair, Networks, WebAuth } from "@stellar/stellar-sdk";
import { randomBytes } from "node:crypto";
import { env } from "@/config/env.js";

const NETWORK_PASSPHRASE =
  env.STELLAR_NETWORK === "TESTNET"
    ? Networks.TESTNET
    : env.STELLAR_NETWORK === "PUBLIC"
      ? Networks.PUBLIC
      : env.STELLAR_NETWORK_PASSPHRASE;

/**
 * SEP-10 ("Stellar Web Authentication") wallet login. The server proves its
 * own identity by signing a throwaway challenge transaction with a keypair
 * that holds no funds and is never used for anything else; the wallet
 * proves ownership of its public key by countersigning the same
 * transaction. Neither side ever transmits a private key.
 */
export class Sep10Service {
  private readonly serverKeypair: Keypair;

  constructor(serverSecret = env.SEP10_SERVER_SECRET) {
    if (!serverSecret) {
      throw new Error("SEP10_SERVER_SECRET is not configured");
    }
    this.serverKeypair = Keypair.fromSecret(serverSecret);
  }

  get serverPublicKey(): string {
    return this.serverKeypair.publicKey();
  }

  /**
   * `nonce` here is purely our own application-level bookkeeping key (used
   * to enforce a challenge is consumed at most once) — it is *not* the
   * SEP-10 transaction memo. SEP-10's actual anti-replay randomness is the
   * 64-byte random value `buildChallengeTx` embeds in the transaction's
   * first `ManageData` operation internally; we don't need to (and per the
   * spec, for a non-muxed account with no memo, should not) supply a memo.
   */
  buildChallenge(clientPublicKey: string): { challengeXdr: string; nonce: string } {
    const nonce = randomBytes(16).toString("hex");
    const challengeXdr = WebAuth.buildChallengeTx(
      this.serverKeypair,
      clientPublicKey,
      env.HOME_DOMAIN,
      env.SEP10_CHALLENGE_TTL_SECONDS,
      NETWORK_PASSPHRASE,
      env.WEB_AUTH_DOMAIN,
    );
    return { challengeXdr, nonce };
  }

  /** Verifies the client signed the challenge with its master key. Returns the client's public key on success. */
  verifyChallenge(signedChallengeXdr: string, expectedClientPublicKey: string): string {
    const [clientKey] = WebAuth.verifyChallengeTxSigners(
      signedChallengeXdr,
      this.serverPublicKey,
      NETWORK_PASSPHRASE,
      [expectedClientPublicKey],
      env.HOME_DOMAIN,
      env.WEB_AUTH_DOMAIN,
    );
    if (!clientKey) {
      throw new Error("Challenge signature verification failed");
    }
    return clientKey;
  }
}

export const sep10Service = new Sep10Service();
