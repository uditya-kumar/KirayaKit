import { fetchBillReceipt } from "@/api/bills";
import { useQuery } from "@tanstack/react-query";

/**
 * One bill, in the detail the receipt prints.
 *
 * Its own key rather than a lookup inside `["bills", "list", tenantId]`: that
 * list carries four columns per month, and this screen needs every line of one
 * of them. Held back until there is a bill id, the same way `useBillDraft` waits
 * for a tenant — a route param can be missing for a render on a deep link or a
 * reload in dev, and a request with no id asks the whole table for its first row.
 */
export function useBillReceipt(billId: string | undefined) {
  return useQuery({
    queryKey: ["bills", "receipt", billId] as const,
    queryFn: () => {
      if (!billId) throw new Error("No bill to show.");
      return fetchBillReceipt(billId);
    },
    enabled: Boolean(billId),
  });
}
