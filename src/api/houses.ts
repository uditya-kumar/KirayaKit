import { ensureProfile } from "@/api/profile";
import { neon } from "@/libs/neon";
import type { Tables, TablesInsert } from "@/types/database";

/**
 * A house as the list needs it. The generator types every view column as
 * nullable, but `id` and `name` are NOT NULL on the underlying table, so rows
 * are narrowed once here rather than defaulted at every use.
 */
export type House = Pick<Tables<"v_house_list">, "address" | "tenant_count"> & {
  id: string;
  name: string;
};

const HOUSE_LIST_COLUMNS = "id, name, address, tenant_count";

/**
 * Every house the signed-in landlord owns, alphabetically.
 *
 * `v_house_list` already carries the tenant count, so one request fills the home
 * screen. RLS scopes it to the owner, which is why there is no filter on
 * owner_id — adding one would be redundant, and leaving it out is not a hole.
 */
export async function fetchHouses(): Promise<House[]> {
  const { data, error } = await neon
    .from("v_house_list")
    .select(HOUSE_LIST_COLUMNS)
    .order("name");

  if (error) throw error;

  return data.filter(
    (row): row is House => row.id !== null && row.name !== null,
  );
}

/**
 * What the Add House form collects. `owner_id` is left out on purpose — the
 * column defaults to `auth.user_id()`, so the token decides the owner and the
 * client cannot claim someone else's.
 */
export type NewHouse = Pick<
  TablesInsert<"houses">,
  "name" | "address" | "number_of_floors" | "upi_id" | "gpay_number"
>;

/** Postgres foreign-key violation: the owner has no `users` row yet. */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Creates a house and returns its id.
 *
 * The insert is tried first and `ensureProfile()` only runs if it fails on the
 * owner FK, which is the very first write of a new account. Calling it up front
 * every time would add a round trip to every create for a row that exists after
 * the first one.
 */
export async function createHouse(house: NewHouse): Promise<string> {
  const insert = () => neon.from("houses").insert(house).select("id").single();

  let result = await insert();

  if (result.error?.code === FOREIGN_KEY_VIOLATION) {
    await ensureProfile();
    result = await insert();
  }

  if (result.error) throw result.error;

  return result.data.id;
}

/**
 * Removes a house from the app.
 *
 * A soft delete, which is what the schema is built for: the unique index on
 * (owner_id, lower(name)) is scoped to `deleted_at IS NULL`, so the name is free
 * again immediately, and `v_house_list` — the only way into a house — skips
 * deleted rows, so the house and everything under it becomes unreachable. A real
 * DELETE would cascade through the tenants, bills and receipts, which is more
 * than a typed confirmation should be able to destroy.
 */
export async function deleteHouse(id: string): Promise<void> {
  const { error } = await neon
    .from("houses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
