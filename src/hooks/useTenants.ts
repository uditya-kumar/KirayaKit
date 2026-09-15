import { fetchTenants } from "@/api/tenants";
import { useQuery } from "@tanstack/react-query";

/**
 * The tenants of one house. `houseId` is part of the query key, so two houses
 * cache separately and moving between them never shows the other's list.
 *
 * Held back until the id is there, like `useBillDraft`: a route param can be
 * missing for a render — a deep link, a reload in dev — and asking anyway sends
 * `house_id=eq.undefined`, which comes back as a complaint about uuid syntax
 * rather than as the missing id it is. Parked, the screen keeps its spinner and
 * loads as soon as the param lands.
 */
export function useTenants(houseId: string | undefined) {
  return useQuery({
    queryKey: ["tenants", "list", houseId] as const,
    queryFn: () => {
      if (!houseId) throw new Error("No house to list.");
      return fetchTenants(houseId);
    },
    enabled: Boolean(houseId),
  });
}
