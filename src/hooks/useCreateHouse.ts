import { createHouse } from "@/api/houses";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateHouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHouse,
    onSuccess: () => {
      // The list is what the new house has to show up in, and nothing else is
      // cached under "houses" yet, so invalidating the whole prefix is enough.
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      // Profile's Properties tile counts them, and it is on a tab that stays
      // mounted — nothing refetches it on focus, so it has to be told.
      return queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
