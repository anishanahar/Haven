"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type CreateGoalInput, type PatchGoalInput, goalsApi } from "@/lib/api-client";
import { prepareSignSubmit } from "@/lib/prepare-sign-submit";
import { useAuthStore } from "@/store/auth-store";

export function useGoals(includeClosed = false) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["goals", { includeClosed }],
    queryFn: () => goalsApi.list(includeClosed).then((r) => r.goals),
    enabled: !!token,
  });
}

export function useGoal(id: string | undefined) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["goal", id],
    queryFn: () => goalsApi.get(id!).then((r) => r.goal),
    enabled: !!token && !!id,
  });
}

export function useGoalHistory(id: string | undefined) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["goal", id, "history"],
    queryFn: () => goalsApi.history(id!).then((r) => r.history),
    enabled: !!token && !!id,
  });
}

function useWalletAddress() {
  const user = useAuthStore((s) => s.user);
  return user?.publicKey;
}

export function useCreateGoal() {
  const address = useWalletAddress();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateGoalInput, "signedXdr">) => {
      if (!address) throw new Error("Connect a wallet first");
      return prepareSignSubmit(address, (signedXdr) => goalsApi.create({ ...input, signedXdr }));
    },
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success(`"${goal.name}" created on-chain`);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to create goal");
    },
  });
}

export function usePatchGoal(goalId: string) {
  const address = useWalletAddress();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<PatchGoalInput, "signedXdr">) => {
      if (!address) throw new Error("Connect a wallet first");
      return prepareSignSubmit(address, (signedXdr) => goalsApi.patch(goalId, { ...input, signedXdr }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
      toast.success("Goal updated");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update goal");
    },
  });
}

export function useDeleteGoal() {
  const address = useWalletAddress();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      if (!address) throw new Error("Connect a wallet first");
      return prepareSignSubmit(address, (signedXdr) => goalsApi.remove(goalId, signedXdr));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal closed and funds returned");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to close goal");
    },
  });
}
