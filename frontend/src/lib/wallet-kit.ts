"use client";

import { StellarWalletsKit, Networks as KitNetworks } from "@creit.tech/stellar-wallets-kit";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { stellarConfig } from "@/config/site";

let initialized = false;

/** Idempotent — safe to call from any client component that needs the kit. */
export function ensureWalletKitInitialized() {
  if (initialized) return;
  StellarWalletsKit.init({
    network: stellarConfig.network === "PUBLIC" ? KitNetworks.PUBLIC : KitNetworks.TESTNET,
    modules: [new FreighterModule(), new xBullModule(), new LobstrModule(), new RabetModule(), new AlbedoModule()],
  });
  initialized = true;
}

export async function connectWallet(): Promise<{ address: string; walletId: string }> {
  ensureWalletKitInitialized();
  const { address } = await StellarWalletsKit.authModal();
  const walletId = StellarWalletsKit.selectedModule?.productId ?? "unknown";
  return { address, walletId };
}

export async function signXdr(xdr: string, address: string): Promise<string> {
  ensureWalletKitInitialized();
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    address,
    networkPassphrase: stellarConfig.networkPassphrase,
  });
  return signedTxXdr;
}

export async function disconnectWallet(): Promise<void> {
  ensureWalletKitInitialized();
  await StellarWalletsKit.disconnect();
}
