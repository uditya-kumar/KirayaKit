import { updateHouse, type HouseInput } from "@/api/houses";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateHouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (edit: { id: string; house: HouseInput }) =>
      updateHouse(edit.id, edit.house),
    // The list shows the name and address and the detail row is what the form
    // reads back; both live under "houses", so the prefix covers them.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["houses"] }),
  });
}
