import { fetchOwnerSummary } from "@/api/profile";
import { useQuery } from "@tanstack/react-query";

/** The Profile screen's three stat tiles: properties, tenants, pending. */
export function useOwnerSummary() {
  return useQuery({
    queryKey: ["profile", "summary"] as const,
    queryFn: fetchOwnerSummary,
  });
}
