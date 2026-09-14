import { fetchBillDraft } from "@/api/bills";
import { useQuery } from "@tanstack/react-query";

/**
 * The bill form's month, whether or not it has been billed yet.
 *
 * The month is in the key, so changing it in the picker fetches that month's
 * draft and stepping back to one already seen draws it from the cache.
 *
 * Held back until there is a tenant to ask about: a route param can be missing
 * for a render — a deep link, a reload in dev — and calling anyway sends an RPC
 * with no arguments, which the Data API rejects as a function it cannot find
 * rather than as the missing id it is.
 */
export function useBillDraft(tenantId: string | undefined, month: string) {
  return useQuery({
    queryKey: ["bills", "draft", tenantId, month] as const,
    queryFn: () => {
      if (!tenantId) throw new Error("No tenant to bill.");
      return fetchBillDraft(tenantId, month);
    },
    enabled: Boolean(tenantId),
  });
}
