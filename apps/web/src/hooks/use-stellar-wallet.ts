import { useState, useEffect, useCallback } from "react";
import { connectWallet, getWalletAddress, signTx } from "../lib/stellar-wallet";
import { fetchXlmBalance, buildPaymentXdr, submitSignedTx } from "../lib/stellar-sdk";

interface UseWalletState {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<UseWalletState>({
    address: null,
    balance: null,
    isConnected: false,
    isLoading: true, // initial load
    error: null,
  });

  const refreshBalance = useCallback(async (addr?: string) => {
    const addressToUse = addr || state.address;
    if (!addressToUse) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const balance = await fetchXlmBalance(addressToUse);
      setState(prev => ({ ...prev, balance, isLoading: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || "Failed to fetch balance", isLoading: false }));
    }
  }, [state.address]);

  useEffect(() => {
    async function checkExistingConnection() {
      try {
        const address = await getWalletAddress();
        if (address) {
          setState(prev => ({ ...prev, address, isConnected: true }));
          await refreshBalance(address);
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
    checkExistingConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const address = await connectWallet();
      setState(prev => ({ ...prev, address, isConnected: true }));
      await refreshBalance(address);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || "Failed to connect wallet", isLoading: false }));
    }
  };

  const disconnect = () => {
    setState({
      address: null,
      balance: null,
      isConnected: false,
      isLoading: false,
      error: null,
    });
  };

  const sendXlm = async (to: string, amount: string): Promise<{ hash: string }> => {
    if (!state.address) {
      throw new Error("Wallet not connected");
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const xdr = await buildPaymentXdr(state.address, to, amount);
      const signedXdr = await signTx(xdr);
      const result = await submitSignedTx(signedXdr);
      
      // Refresh balance after successful send
      await refreshBalance(state.address);
      
      return result;
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || "Transaction failed", isLoading: false }));
      throw err;
    } finally {
      // In case we don't throw, we still want to unset isLoading if needed, but it's handled in refreshBalance
      if (state.isLoading) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  };

  return {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  };
}
