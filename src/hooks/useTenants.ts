import { fetchTenants } from "@/api/tenants";
import { useQuery } from "@tanstack/react-query";

/**
 * The tenants of one house. `houseId` is part of the query key, so two houses
 * cache separately and moving between them never shows the other's list.
 */
export function useTenants(houseId: string) {
  return useQuery({
    queryKey: ["tenants", "list", houseId] as const,
    queryFn: () => fetchTenants(houseId),
  });
}
