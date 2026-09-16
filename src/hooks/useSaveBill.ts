import { saveBill, type BillWrite } from "@/api/bills";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSaveBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bill: BillWrite) => saveBill(bill),
    // A bill changes what the tenant owes, so the tenants list and the tenant's
    // own screen are as stale as the bill lists themselves; the house cards carry
    // pending totals too. Everything under the three prefixes goes.
    //
    // "bills" has to go wholesale rather than by tenant: correcting one month
    // rewrites the carried balance of every month after it (0005), so the other
    // bills in this tenant's ledger are stale too.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      return queryClient.invalidateQueries({ queryKey: ["houses"] });
    },
  });
}
