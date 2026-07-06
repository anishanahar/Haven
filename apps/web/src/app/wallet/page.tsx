"use client";

import React from "react";
import { StellarWalletPanel } from "../../components/wallet/stellar-wallet-panel";

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Stellar Wallet — Freighter Integration
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Connect your Freighter wallet to interact with the Stellar testnet.
          </p>
        </div>
        
        <StellarWalletPanel />
      </div>
    </div>
  );
}
