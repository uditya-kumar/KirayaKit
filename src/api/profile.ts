import { neon } from "@/libs/neon";

/**
 * Creates this landlord's `users` row if it is their first sign-in, and returns
 * quietly if it already exists.
 *
 * Called as a repair rather than on sign-in: `createHouse` tries its insert first
 * and comes here only when the missing row makes the owner_id FK fail, which
 * keeps the common path at one request.
 */
export async function ensureProfile(): Promise<void> {
  const { error } = await neon.rpc("ensure_profile");
  if (error) throw error;
}

/** The three numbers across the top of the Profile screen. */
export type OwnerSummary = {
  /** Houses that have not been deleted. */
  properties: number;
  /** Active tenants across all of them. */
  tenants: number;
  /** Rupees still owed, across every tenant. */
  pending: number;
};

/**
 * The portfolio totals for the signed-in landlord.
 *
 * Two requests because no view carries a portfolio-wide total: the houses list
 * already counts active tenants per house, and the pending figure has to be
 * reduced from bills. `v_tenant_list.total_pending` is not usable for it — it sums
 * every month, and an unpaid month is carried into the next bill and billed again,
 * so a tenant's debt would be counted once per month it has been owed.
 *
 * TODO: a v_owner_summary view (one row per owner) would make this one request
 * and put the maths where the rest of it lives, in SQL.
 */
export async function fetchOwnerSummary(): Promise<OwnerSummary> {
  const [houses, bills] = await Promise.all([
    // Row count is the number of properties, hence no columns beyond the one
    // being totalled.
    neon.from("v_house_list").select("tenant_count"),
    neon
      .from("v_bill_receipt")
      .select("tenant_id, balance_due")
      .order("bill_month", { ascending: false }),
  ]);

  if (houses.error) throw houses.error;
  if (bills.error) throw bills.error;

  const tenants = houses.data.reduce(
    (total, house) => total + (house.tenant_count ?? 0),
    0,
  );

  // The newest bill's balance is the whole debt, so only the first row seen for
  // each tenant counts — and the rows arrive newest first, which is what makes
  // "first seen" mean "newest". Overpayment is a credit against that tenant
  // alone, so it is clamped rather than deducted from what the others owe.
  const counted = new Set<string>();
  let pending = 0;
  for (const bill of bills.data) {
    if (!bill.tenant_id || counted.has(bill.tenant_id)) continue;
    counted.add(bill.tenant_id);
    pending += Math.max(0, Number(bill.balance_due ?? 0));
  }

  return { properties: houses.data.length, tenants, pending };
}
