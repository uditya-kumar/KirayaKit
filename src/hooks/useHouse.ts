import { fetchHouse } from "@/api/houses";
import { skipToken, useQuery } from "@tanstack/react-query";

/**
 * One house's editable fields. The id is optional because the House form is also
 * the Add House form, where there is nothing to load — `skipToken` parks the query
 * instead of firing it with a placeholder id.
 */
export function useHouse(houseId?: string) {
  return useQuery({
    // Under the same "houses" prefix as the list, so one invalidate after a write
    // covers both.
    queryKey: ["houses", "detail", houseId] as const,
    queryFn: houseId ? () => fetchHouse(houseId) : skipToken,
  });
}
