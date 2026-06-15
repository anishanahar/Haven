"use client";

import { useMutation } from "@tanstack/react-query";
import { plannerApi } from "@/lib/api-client";

export function usePlanner() {
  return useMutation({
    mutationFn: plannerApi.plan,
  });
}
