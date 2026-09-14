import { fetchTenant } from "@/api/tenants";
import { useQuery } from "@tanstack/react-query";

/** One tenant's header details. Cached beside the lists under "tenants". */
export function useTenant(tenantId: string) {
  return useQuery({
    queryKey: ["tenants", "detail", tenantId] as const,
    queryFn: () => fetchTenant(tenantId),
  });
}
