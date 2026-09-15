import { deleteTenant } from "@/api/tenants";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTenant,
    onSuccess: (_result, tenantId) => {
      // The screen that showed them is on its way out: drop their rows rather
      // than refetching a tenant the view no longer returns.
      queryClient.removeQueries({ queryKey: ["tenants", "detail", tenantId] });
      queryClient.removeQueries({ queryKey: ["bills", "list", tenantId] });
      // The house's list loses a row, and its card in the house list loses one
      // from the tenant count.
      queryClient.invalidateQueries({ queryKey: ["tenants", "list"] });
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      // Profile loses a tenant, and whatever they owed leaves the pending total.
      return queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
