import { fetchBillDraft } from "@/api/bills";
import { useQuery } from "@tanstack/react-query";

/**
 * The bill form's month, whether or not it has been billed yet.
 *
 * Never served from the cache: `gcTime: 0` drops a draft as soon as the form
 * stops showing it, so every open waits for a fresh one. The form copies the
 * draft into its fields once, on mount, so a cached draft was not just stale but
 * stuck — open October, bill September, reopen October, and the old draft seeded
 * Current with the opening reading while the background refetch moved Previous
 * up to September's, and the bill opened at negative units.
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
    gcTime: 0,
  });
}
