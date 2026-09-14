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

/** One "Extra charges (Optional)" row: a `bill_charges` record, without its ids. */
export type BillCharge = {
  label: string;
  amount: number;
};

/**
 * One month of a tenant's bill as the form edits it — the bill that exists, or
 * the bill that would exist if it were raised now.
 *
 * `bill_draft` decides which of those it is, so the screen seeds the same fields
 * either way and never works out a previous reading or a carried balance itself.
 */
export type BillDraft = {
  /** null when the month has not been billed yet, which makes the form a create. */
  billId: string | null;
  /** Snapshotted on the bill, so an old month keeps the rent it was raised with. */
  rentAmount: number;
  electricityRate: number;
  previousReading: number;
  previousBalance: number;
  currentReading: number;
  amountPaid: number;
  charges: BillCharge[];
};

/**
 * `bill_charges` comes back as a jsonb array, which the generator types as `Json`
 * — the widest thing a column can hold. Rows that do not look like a charge are
 * dropped rather than defaulted, the same way the view rows are narrowed above.
 */
function toCharges(value: unknown): BillCharge[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (typeof row !== "object" || row === null) return [];
    const { label, amount } = row as { label?: unknown; amount?: unknown };
    return typeof label === "string" ? [{ label, amount: Number(amount) }] : [];
  });
}

/**
 * What the bill form fills its fields with, for one tenant and one month.
 *
 * `month` is the first of the month ("2026-09-01"), which is a bill's identity —
 * see `bills_tenant_month_key`. Numbers are coerced because Postgres `numeric`
 * arrives as a string whenever it cannot survive JSON exactly.
 */
export async function fetchBillDraft(
  tenantId: string,
  month: string,
): Promise<BillDraft> {
  const { data, error } = await neon
    .rpc("bill_draft", { p_tenant: tenantId, p_month: month })
    .single();

  if (error) throw error;

  return {
    billId: data.bill_id,
    rentAmount: Number(data.rent_amount),
    electricityRate: Number(data.electricity_rate),
    previousReading: Number(data.previous_reading),
    previousBalance: Number(data.previous_balance),
    currentReading: Number(data.current_reading),
    amountPaid: Number(data.amount_paid),
    charges: toCharges(data.charges),
  };
}

/** The fields the bill form actually writes; the rest the database derives. */
export type BillWrite = {
  tenantId: string;
  /** First of the month. Saving a month that is already billed corrects that bill. */
  month: string;
  currentReading: number;
  amountPaid: number;
  charges: BillCharge[];
};

/**
 * Raises or corrects one month's bill and its charge rows, and answers with the
 * bill's id.
 *
 * A bill plus its charges is several statements, so it goes through the `save_bill`
 * function: one round trip, and either all of it lands or none of it does. The
 * rent, the rate, the previous reading and the carried balance are all decided
 * there — a form that has been sitting open cannot write a stale one.
 */
export async function saveBill(bill: BillWrite): Promise<string> {
  const { data, error } = await neon.rpc("save_bill", {
    p_tenant: bill.tenantId,
    p_month: bill.month,
    p_current_reading: bill.currentReading,
    p_amount_paid: bill.amountPaid,
    p_charges: bill.charges,
  });

  if (error) throw error;

  // No id means the tenant matched nothing the owner policy would show — deleted
  // in another session, or never theirs. Nothing was written.
  if (data === null) throw new Error("That tenant is no longer here.");

  return data;
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
