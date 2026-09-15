import { fetchTenant } from "@/api/tenants";
import { useQuery } from "@tanstack/react-query";

/**
 * One tenant's header details. Cached beside the lists under "tenants".
 *
 * Parked until the route param arrives, for the reason spelled out in
 * `useTenants`: without the guard a missing id asks the view for `id=eq.undefined`.
 */
export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenants", "detail", tenantId] as const,
    queryFn: () => {
      if (!tenantId) throw new Error("No tenant to show.");
      return fetchTenant(tenantId);
    },
    enabled: Boolean(tenantId),
  });
}
