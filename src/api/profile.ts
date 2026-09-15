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
 * The portfolio totals for the signed-in landlord — one row, one request.
 *
 * `v_owner_summary` (0005) does the counting. It used to be done here, from every
 * bill in the account: the reduce needed the newest bill per tenant, so the client
 * downloaded all of them and threw most away — unbounded as the months add up, and
 * silently short the moment the Data API's row cap cut the list off.
 *
 * An account with no `users` row yet — signed up, no house created, so
 * `ensureProfile` has never run — matches no row at all. That is a real state and
 * an empty portfolio is the honest reading of it, not an error.
 */
export async function fetchOwnerSummary(): Promise<OwnerSummary> {
  const { data, error } = await neon
    .from("v_owner_summary")
    .select("properties, tenants, pending")
    .limit(1);

  if (error) throw error;

  const row = data.at(0);

  // The view's columns are nullable to the generator because it cannot see that
  // count() and a COALESCEd sum() never are.
  return {
    properties: Number(row?.properties ?? 0),
    tenants: Number(row?.tenants ?? 0),
    pending: Number(row?.pending ?? 0),
  };
}
