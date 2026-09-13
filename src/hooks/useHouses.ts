import { fetchHouses } from "@/api/houses";
import { useQuery } from "@tanstack/react-query";

export function useHouses() {
  return useQuery({
    queryKey: ["houses", "list"] as const,
    queryFn: fetchHouses,
  });
}
