import { fetchTenantRecord } from "@/api/tenants";
import { skipToken, useQuery } from "@tanstack/react-query";

/**
 * One tenant's editable fields. The id is optional because the Tenant form is also
 * the Create Tenant form, where there is nothing to load — `skipToken` parks the
 * query instead of firing it with a placeholder id.
 *
 * Kept under a "record" key rather than "detail": that one holds the view row the
 * tenant's own screen shows, which is a different set of columns.
 */
export function useTenantRecord(tenantId?: string) {
  return useQuery({
    queryKey: ["tenants", "record", tenantId] as const,
    queryFn: tenantId ? () => fetchTenantRecord(tenantId) : skipToken,
  });
}
