"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api-client";
import { connectWallet, disconnectWallet, signXdr } from "@/lib/wallet-kit";
import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const { token, user, walletId, setSession, clearSession } = useAuthStore();
  const queryClient = useQueryClient();

  const connect = useMutation({
    mutationFn: async () => {
      const { address, walletId: connectedWalletId } = await connectWallet();
      const { challengeXdr, nonce } = await authApi.challenge(address);
      const signedChallengeXdr = await signXdr(challengeXdr, address);
      const { token: sessionToken, user: sessionUser } = await authApi.verify(address, nonce, signedChallengeXdr);
      setSession(sessionToken, sessionUser, connectedWalletId);
      return sessionUser;
    },
    onSuccess: () => {
      toast.success("Wallet connected");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not connect wallet";
      toast.error(message);
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } finally {
        await disconnectWallet().catch(() => undefined);
      }
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });

  return {
    isAuthenticated: !!token,
    token,
    user,
    walletId,
    connect: connect.mutate,
    isConnecting: connect.isPending,
    logout: logout.mutate,
    isLoggingOut: logout.isPending,
  };
}
