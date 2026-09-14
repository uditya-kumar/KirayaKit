import { neon } from "@/libs/neon";
import type { Tables } from "@/types/database";

/**
 * A tenant as a house's list needs it. Narrowed the same way `House` is: the
 * generator types every view column nullable, but these four are NOT NULL on
 * `tenants` and `total_pending` is COALESCEd to 0 in the view, so the rows are
 * cleaned up once here instead of being defaulted at every use.
 */
export type Tenant = Pick<Tables<"v_tenant_list">, "mobile_number"> & {
  id: string;
  name: string;
  floor_number: number;
  monthly_rent: number;
  total_pending: number;
};

const TENANT_LIST_COLUMNS =
  "id, name, floor_number, mobile_number, monthly_rent, total_pending";

/**
 * The tenants of one house, ground floor first.
 *
 * Only active ones: `v_tenant_list` also carries people who have moved out, and
 * the tenant count on the house card comes from `v_house_list`, which counts
 * active rows alone — listing history here would make the two disagree.
 *
 * RLS scopes the rows to the owner, so `house_id` is the only filter needed.
 */
export async function fetchTenants(houseId: string): Promise<Tenant[]> {
  const { data, error } = await neon
    .from("v_tenant_list")
    .select(TENANT_LIST_COLUMNS)
    .eq("house_id", houseId)
    .eq("is_active", true)
    .order("floor_number")
    .order("name");

  if (error) throw error;

  return data.filter(
    (row): row is Tenant =>
      row.id !== null &&
      row.name !== null &&
      row.floor_number !== null &&
      row.monthly_rent !== null &&
      row.total_pending !== null,
  );
}
