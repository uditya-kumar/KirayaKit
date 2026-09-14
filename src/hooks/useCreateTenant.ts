import { createTenant } from "@/api/tenants";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTenant,
    onSuccess: (_id, tenant) => {
      // Two things went stale: the house's tenant list, and the tenant count on
      // its card in the house list.
      queryClient.invalidateQueries({
        queryKey: ["tenants", "list", tenant.house_id],
      });
      return queryClient.invalidateQueries({ queryKey: ["houses"] });
    },
  });
}
