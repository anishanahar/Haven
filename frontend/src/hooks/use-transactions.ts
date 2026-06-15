"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transactionsApi } from "@/lib/api-client";
import { prepareSignSubmit } from "@/lib/prepare-sign-submit";
import { useAuthStore } from "@/store/auth-store";

export function useTransactions(opts: { goalId?: string; limit?: number } = {}) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["transactions", opts],
    queryFn: () => transactionsApi.list(opts).then((r) => r.transactions),
    enabled: !!token,
  });
}

function invalidateAfterVaultAction(queryClient: ReturnType<typeof useQueryClient>, goalId: string) {
  queryClient.invalidateQueries({ queryKey: ["goals"] });
  queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

export function useDeposit() {
  const address = useAuthStore((s) => s.user?.publicKey);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { goalId: string; amount: number }) => {
      if (!address) throw new Error("Connect a wallet first");
      return prepareSignSubmit(address, (signedXdr) => transactionsApi.deposit(vars.goalId, vars.amount, signedXdr));
    },
    onSuccess: (_goal, vars) => {
      invalidateAfterVaultAction(queryClient, vars.goalId);
      toast.success(`Deposited ${vars.amount} to your goal`);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Deposit failed"),
  });
}

export function useWithdraw() {
  const address = useAuthStore((s) => s.user?.publicKey);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { goalId: string; amount: number }) => {
      if (!address) throw new Error("Connect a wallet first");
      return prepareSignSubmit(address, (signedXdr) => transactionsApi.withdraw(vars.goalId, vars.amount, signedXdr));
    },
    onSuccess: (_goal, vars) => {
      invalidateAfterVaultAction(queryClient, vars.goalId);
      toast.success(`Withdrew ${vars.amount} from your goal`);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Withdrawal failed"),
  });
}

export function useClaimInterest() {
  const address = useAuthStore((s) => s.user?.publicKey);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { goalId: string }) => {
      if (!address) throw new Error("Connect a wallet first");
      return prepareSignSubmit(address, (signedXdr) => transactionsApi.claim(vars.goalId, signedXdr));
    },
    onSuccess: (_goal, vars) => {
      invalidateAfterVaultAction(queryClient, vars.goalId);
      toast.success("Interest claimed");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Claim failed"),
  });
}
