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

/**
 * One month's bill in the detail the receipt prints: every line of it, and who
 * it is for.
 *
 * `charges` is the `bill_charges` rows rather than the view's
 * `extra_charges_total`, because the receipt lists them one per line — "Water
 * charge", "IGL (Gas)" — and a single total cannot be taken apart again.
 *
 * `upi_id` and `gpay_number` are the house's, and both are nullable: they are
 * plain text columns an owner may leave empty, which is why they are outside
 * `isBillReceipt` rather than being checked with the rest.
 */
export type BillReceipt = {
  id: string;
  bill_month: string;
  tenant_name: string;
  floor_number: number;
  house_name: string;
  rent_amount: number;
  units_consumed: number;
  electricity_rate: number;
  electricity_amount: number;
  previous_balance: number;
  total_billed: number;
  upi_id: string | null;
  gpay_number: string | null;
  charges: BillCharge[];
};

// No amount_paid or balance_due: a receipt says what was billed, and the payment
// side of the ledger is the tenant detail screen's business. The two payment
// handles are here because the receipt is what asks to be paid — every message
// in the requirements ends with them.
const BILL_RECEIPT_COLUMNS =
  "id, bill_month, tenant_name, floor_number, house_name, rent_amount, units_consumed, electricity_rate, electricity_amount, previous_balance, total_billed, upi_id, gpay_number, bill_charges(label, amount, sort_order)";

/** The receipt's own fields — the row above without the charges hanging off it. */
type BillFields = Omit<BillReceipt, "charges">;

type BillReceiptRow = Pick<Tables<"v_bill_receipt">, keyof BillFields> & {
  bill_charges: Pick<
    Tables<"bill_charges">,
    "label" | "amount" | "sort_order"
  >[];
};

/**
 * Every column the receipt prints is NOT NULL on `bills`, `tenants` or `houses`
 * — the generator only types them nullable because they arrive through a view.
 * The charge columns are NOT NULL on their own table, so they need no check.
 */
function isBillReceipt(
  row: BillReceiptRow,
): row is BillReceiptRow & BillFields {
  return (
    row.id !== null &&
    row.bill_month !== null &&
    row.tenant_name !== null &&
    row.floor_number !== null &&
    row.house_name !== null &&
    row.rent_amount !== null &&
    row.units_consumed !== null &&
    row.electricity_rate !== null &&
    row.electricity_amount !== null &&
    row.previous_balance !== null &&
    row.total_billed !== null
  );
}

/**
 * One bill, with its extra charges, in a single request.
 *
 * The charges come down embedded: `bill_charges` points at the bill through a
 * composite foreign key, which PostgREST can follow even from the view. They are
 * ordered here rather than in the query because an embedded resource's order is
 * a client-version-specific parameter, while `sort_order` is on the rows anyway.
 *
 * Addressed by bill id alone, as everywhere else — RLS decides whether the row
 * exists for this owner, and a bill the tenant no longer has is simply absent.
 */
export async function fetchBillReceipt(billId: string): Promise<BillReceipt> {
  const { data, error } = await neon
    .from("v_bill_receipt")
    .select(BILL_RECEIPT_COLUMNS)
    .eq("id", billId)
    .limit(1);

  if (error) throw error;

  const row = data.filter(isBillReceipt).at(0);
  if (!row) throw new Error("This bill is no longer here.");

  const { bill_charges, ...fields } = row;

  return {
    ...fields,
    charges: [...bill_charges]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(({ label, amount }) => ({ label, amount })),
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
 * adding the older balances up would charge the same rupees twice over. This is
 * the same figure `v_tenant_list.total_pending` carries, with one difference —
 * the view clamps at zero because a card labelled "pending" cannot show a credit,
 * and this returns it signed so the screen can say so in words.
 *
 * Negative means the tenant is in credit: they paid past the total, and the
 * surplus travels into the next bill as a negative previous_balance.
 */
export function outstandingAmount(bills: Bill[]): number {
  return bills.at(0)?.balance_due ?? 0;
}
