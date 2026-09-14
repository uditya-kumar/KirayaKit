import { neon } from "@/libs/neon";
import type { Tables, TablesInsert } from "@/types/database";

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

/**
 * What the Create Tenant form collects. `owner_id` is left out on purpose — the
 * column defaults to `auth.user_id()`, and the composite FK to `houses` then
 * requires the house to belong to that same owner.
 */
export type NewTenant = Pick<
  TablesInsert<"tenants">,
  | "house_id"
  | "name"
  | "mobile_number"
  | "aadhaar_number"
  | "floor_number"
  | "monthly_rent"
  | "electricity_rate"
  | "opening_meter_reading"
  | "agreement_expiry"
>;

/**
 * Creates a tenant and returns their id.
 *
 * No `ensureProfile()` repair here, unlike `createHouse`: a tenant hangs off a
 * house, and the house could not have been created without the profile row.
 */
export async function createTenant(tenant: NewTenant): Promise<string> {
  const { data, error } = await neon
    .from("tenants")
    .insert(tenant)
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}
