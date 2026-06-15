"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

export function useAnalytics(days = 30) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["analytics", { days }],
    queryFn: () => analyticsApi.overview(days),
    enabled: !!token,
  });
}
