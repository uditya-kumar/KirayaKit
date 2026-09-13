import { neon } from "@/libs/neon";
import type { Tables } from "@/types/database";

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
