"use client";

import React, { useEffect, useState } from "react";
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

  const [hasFreighter, setHasFreighter] = useState<boolean>(true);
  const [checkingFreighter, setCheckingFreighter] = useState(true);
  
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState("");
  const [txError, setTxError] = useState("");

  useEffect(() => {
    async function checkExtension() {
      const detected = await detectFreighter();
      setHasFreighter(detected);
      setCheckingFreighter(false);
    }
    checkExtension();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAddress || !amount) return;
    
    setTxStatus("pending");
    setTxError("");
    setTxHash("");
    
    try {
      const result = await sendXlm(toAddress, amount);
      setTxHash(result.hash);
      setTxStatus("success");
      setToAddress("");
      setAmount("");
    } catch (err: any) {
      setTxError(err.message || "Failed to send transaction");
      setTxStatus("error");
    }
  };

  if (checkingFreighter) {
    return (
      <div className="flex justify-center items-center p-8 bg-white rounded-2xl shadow-xl max-w-md mx-auto border border-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasFreighter) {
    return (
      <div className="p-8 bg-white rounded-2xl shadow-xl max-w-md mx-auto border border-gray-100 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Freighter Wallet Required</h2>
        <p className="text-gray-600 mb-6">
          Please install the Freighter browser extension to connect to the Stellar network.
        </p>
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
        >
          Install Freighter
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-auto border border-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Stellar Wallet</h2>
        {isConnected && (
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-green-600">Connected</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {!isConnected ? (
        <div className="flex flex-col items-center">
          <p className="text-gray-500 mb-6 text-center">
            Connect your Freighter wallet to manage your XLM and send transactions on the testnet.
          </p>
          <button
            onClick={connect}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Wallet Address
              </label>
              <div className="font-mono text-sm text-gray-800 break-all bg-white p-2 rounded-lg border border-gray-200">
                {address}
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Balance
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading && !balance ? "Loading..." : balance}
                </div>
              </div>
              <button
                onClick={() => refreshBalance()}
                disabled={isLoading}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-blue-300 flex items-center space-x-1"
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send XLM</h3>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Address
                </label>
                <input
                  type="text"
                  required
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="G..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                  disabled={txStatus === "pending"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (XLM)
                </label>
                <input
                  type="number"
                  step="0.0000001"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={txStatus === "pending"}
                />
              </div>
              <button
                type="submit"
                disabled={txStatus === "pending"}
                className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200"
              >
                {txStatus === "pending" ? "Sending..." : "Send XLM"}
              </button>
            </form>

            {txStatus === "success" && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-green-800 text-sm font-medium mb-1">Transaction sent!</p>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 text-xs font-mono break-all underline"
                >
                  Hash: {txHash}
                </a>
              </div>
            )}

            {txStatus === "error" && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 text-sm font-medium">{txError}</p>
              </div>
            )}
          </div>

          <button
            onClick={disconnect}
            className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
