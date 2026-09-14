import { neon } from "@/libs/neon";
import type { Tables } from "@/types/database";

/**
 * One month of a tenant's ledger, as the tenant detail screen draws it: the
 * current month's card and every row of the payment history are this shape.
 */
export type Bill = {
  id: string;
  /** The first of the month, as the column stores it ("2026-02-01"). */
  bill_month: string;
  total_billed: number;
  amount_paid: number;
  balance_due: number;
};

const BILL_ROW_COLUMNS =
  "id, bill_month, total_billed, amount_paid, balance_due";

type BillRow = Pick<Tables<"v_bill_receipt">, keyof Bill>;

/**
 * Every bill for one tenant, newest month first.
 *
 * The whole ledger comes down in one request rather than being paged: a tenant
 * gains twelve rows a year, and bills_owner_tenant_month_idx returns them already
 * in this order. `balance_due` and the rest are computed by the view, so the app
 * can never disagree with a receipt it has already shared.
 */
export async function fetchBills(tenantId: string): Promise<Bill[]> {
  const { data, error } = await neon
    .from("v_bill_receipt")
    .select(BILL_ROW_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("bill_month", { ascending: false });

  if (error) throw error;

  return data.filter(
    (row): row is Bill =>
      row.id !== null &&
      row.bill_month !== null &&
      row.total_billed !== null &&
      row.amount_paid !== null &&
      row.balance_due !== null,
  );
}

/**
 * What a tenant still owes, from their bills newest-first.
 *
 * The newest bill's balance is the entire debt, not just that month's: an unpaid
 * month is carried into the next bill's `previous_balance` and billed again, so
 * adding the older balances up would charge the same rupees twice over. That is
 * exactly what v_tenant_list.total_pending does — see the TODO in api/tenants.ts.
 */
export function outstandingAmount(bills: Bill[]): number {
  return bills.at(0)?.balance_due ?? 0;
}
