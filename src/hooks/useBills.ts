import { fetchBills } from "@/api/bills";
import { useQuery } from "@tanstack/react-query";

/**
 * One tenant's bills, newest first. The tenant id is in the key, so two tenants
 * never show each other's history.
 */
export function useBills(tenantId: string) {
  return useQuery({
    queryKey: ["bills", "list", tenantId] as const,
    queryFn: () => fetchBills(tenantId),
  });
}
