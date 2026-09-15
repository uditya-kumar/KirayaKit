import { fetchBills } from "@/api/bills";
import { useQuery } from "@tanstack/react-query";

/**
 * One tenant's bills, newest first. The tenant id is in the key, so two tenants
 * never show each other's history.
 *
 * Parked until the route param arrives, for the reason spelled out in
 * `useTenants`: without the guard a missing id filters on `eq.undefined`.
 */
export function useBills(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["bills", "list", tenantId] as const,
    queryFn: () => {
      if (!tenantId) throw new Error("No tenant to show bills for.");
      return fetchBills(tenantId);
    },
    enabled: Boolean(tenantId),
  });
}
