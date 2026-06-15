import { useQuery } from "@tanstack/react-query";
import { achievementsApi } from "@/lib/api-client";

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: achievementsApi.get,
  });
}
