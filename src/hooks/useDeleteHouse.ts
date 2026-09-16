import { deleteHouse } from "@/api/houses";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteHouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHouse,
    onSuccess: (_result, houseId) => {
      // The deleted house's tenants can no longer be reached, so their cache
      // entry is dropped rather than refetched; the house list, which has one
      // fewer card, is refetched.
      queryClient.removeQueries({ queryKey: ["tenants", "list", houseId] });
      return queryClient.invalidateQueries({ queryKey: ["houses"] });
    },
  });
}
