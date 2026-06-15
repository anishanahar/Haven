"use client";

import React, { useState, useEffect } from "react";
import { detectFreighter, connectWallet, signTx } from "../../lib/stellar-wallet";
import { useWallet } from "../../hooks/use-stellar-wallet";

export function StellarWalletPanel() {
  const {
    address,
    balance,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  } = useWallet();

  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    async function checkFreighter() {
      const detected = await detectFreighter();
      setHasFreighter(detected);
    }
    checkFreighter();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxHash(null);
    setTxError(null);
    if (!recipient || !amount) return;

    try {
      const result = await sendXlm(recipient, amount);
      setTxHash(result.hash);
      setRecipient("");
      setAmount("");
    } catch (err: any) {
      setTxError(err.message || "Failed to send transaction");
    }
  };

  if (hasFreighter === false) {
    return (
      <div className="p-6 border rounded-lg bg-gray-50 shadow-sm text-center">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Freighter Wallet Not Detected</h2>
        <p className="mb-4 text-gray-600">Please install the Freighter extension to use this app.</p>
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Install Freighter
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Stellar Wallet</h2>

      {error && !txError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {!isConnected ? (
        <button
          onClick={connect}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">Address</p>
            <p className="font-mono text-sm break-all mb-4 text-gray-800">{address}</p>
            
            <p className="text-sm text-gray-500 mb-1">Balance (Testnet)</p>
            <div className="flex items-center justify-between">
              <p className="text-xl font-semibold text-gray-800">
                {balance === "0" && error === "Account not funded" 
                  ? "0 XLM (account not funded)" 
                  : `${balance} XLM`}
              </p>
              <button
                onClick={() => refreshBalance()}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <button
            onClick={disconnect}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition disabled:opacity-50"
          >
            Disconnect
          </button>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Send XLM</h3>
            
            {txHash && (
              <div className="mb-4 p-3 bg-green-100 text-green-800 rounded text-sm">
                Transaction sent! Hash:{" "}
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline break-all"
                >
                  {txHash}
                </a>
              </div>
            )}
            
            {txError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                {txError}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="G..."
                  required
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (XLM)
                </label>
                <input
                  type="number"
                  step="0.0000001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !recipient || !amount}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Send XLM"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
