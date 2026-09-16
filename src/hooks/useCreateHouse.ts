import { createHouse } from "@/api/houses";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateHouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHouse,
    onSuccess: () => {
      // The list is what the new house has to show up in, and nothing else is
      // cached under "houses" yet, so invalidating the whole prefix is enough.
      return queryClient.invalidateQueries({ queryKey: ["houses"] });
    },
  });
}
