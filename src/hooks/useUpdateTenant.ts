import { updateTenant, type TenantInput } from "@/api/tenants";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (edit: { id: string; tenant: TenantInput }) =>
      updateTenant(edit.id, edit.tenant),
    // The house's list, the tenant's own screen and the row the form reads back
    // all live under "tenants", so the prefix covers the three of them. The house
    // list is untouched: an edit cannot change how many tenants a house has.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });
}
