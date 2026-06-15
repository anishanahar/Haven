import { useState, useCallback } from "react";
import { connectWallet, getWalletAddress, signTx, detectFreighter } from "../lib/stellar-wallet";
import { fetchXlmBalance, buildPaymentXdr, submitSignedTx } from "../lib/stellar-sdk";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const hasFreighter = await detectFreighter();
      if (!hasFreighter) {
        throw new Error("Freighter not detected. Please install Freighter.");
      }
      const addr = await connectWallet();
      setAddress(addr);
      setIsConnected(true);
      await refreshBalance(addr);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setIsConnected(false);
    setError(null);
  }, []);

  const refreshBalance = useCallback(async (addr?: string) => {
    const targetAddress = addr || address;
    if (!targetAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const bal = await fetchXlmBalance(targetAddress);
      setBalance(bal);
    } catch (err: any) {
      if (err.message === "404") {
        setBalance("0");
        setError("Account not funded");
      } else {
        setError(err.message || "Failed to fetch balance");
      }
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const sendXlm = useCallback(async (to: string, amount: string): Promise<{ hash: string }> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }
    setIsLoading(true);
    setError(null);
    try {
      const xdr = await buildPaymentXdr(address, to, amount);
      const signedXdr = await signTx(xdr);
      const result = await submitSignedTx(signedXdr);
      await refreshBalance();
      return result;
    } catch (err: any) {
      const msg = err.message || "Transaction failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [address, refreshBalance]);

  return {
    address,
    balance,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  };
}
