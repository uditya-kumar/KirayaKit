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
 * A tenant as their own screen needs them. Read from the view rather than the
 * table so the house's name arrives with them — the header reads "3rd Floor ·
 * Meera Residency" — and so deleted rows are already filtered out.
 */
export type TenantDetail = {
  id: string;
  name: string;
  house_name: string;
  floor_number: number;
  monthly_rent: number;
  electricity_rate: number;
};

const TENANT_DETAIL_COLUMNS =
  "id, name, house_name, floor_number, monthly_rent, electricity_rate";

type TenantDetailRow = Pick<
  Tables<"v_tenant_list">,
  keyof TenantDetail & keyof Tables<"v_tenant_list">
>;

/** Every column the detail header needs is NOT NULL on the tables behind the view. */
function isTenantDetail(row: TenantDetailRow): row is TenantDetail {
  return (
    row.id !== null &&
    row.name !== null &&
    row.house_name !== null &&
    row.floor_number !== null &&
    row.monthly_rent !== null &&
    row.electricity_rate !== null
  );
}

/**
 * One tenant.
 *
 * `.limit(1)` and a lookup rather than `.single()`: a tenant who has been deleted
 * is simply absent from the view, and "no longer here" is a better thing to put on
 * screen than PostgREST's complaint about the row count.
 */
export async function fetchTenant(id: string): Promise<TenantDetail> {
  const { data, error } = await neon
    .from("v_tenant_list")
    .select(TENANT_DETAIL_COLUMNS)
    .eq("id", id)
    .limit(1);

  if (error) throw error;

  const tenant = data.filter(isTenantDetail).at(0);
  if (!tenant) throw new Error("This tenant is no longer here.");

  return tenant;
}

/**
 * Removes a tenant from the app.
 *
 * Soft, like the house delete: the bills stay in the database, but `v_tenant_list`
 * filters on deleted_at and tenants_active_floor_key only covers live rows, so the
 * floor is free for whoever moves in next. A hard DELETE would cascade the whole
 * billing history away with them.
 */
export async function deleteTenant(id: string): Promise<void> {
  const { error } = await neon
    .from("tenants")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * What the Tenant form collects on a create and on a save alike — one screen fills
 * both. `owner_id` is left out on purpose: the column defaults to
 * `auth.user_id()`, and the composite FK to `houses` then requires the house to
 * belong to that same owner, so the client cannot file a tenant under someone
 * else's house.
 */
export type TenantInput = Pick<
  TablesInsert<"tenants">,
  | "name"
  | "mobile_number"
  | "aadhaar_number"
  | "floor_number"
  | "monthly_rent"
  | "electricity_rate"
  | "agreement_expiry"
>;

/**
 * A create carries two fields a save does not, which is why the Edit Tenant mock
 * (node lXpcT) is one field shorter than Create Tenant: the house is the route the
 * form was opened through, and the opening meter reading is the mark every bill's
 * consumption is measured from — moving it afterwards would silently rewrite
 * receipts already handed to the tenant.
 */
export type NewTenant = TenantInput &
  Pick<TablesInsert<"tenants">, "house_id" | "opening_meter_reading">;

/**
 * One tenant with everything the form fills in. Read from `tenants` rather than
 * `v_tenant_list`: the view is built for lists and carries neither the Aadhaar
 * number nor the agreement expiry.
 */
export type TenantRecord = Pick<
  Tables<"tenants">,
  | "id"
  | "name"
  | "mobile_number"
  | "aadhaar_number"
  | "floor_number"
  | "monthly_rent"
  | "electricity_rate"
  | "agreement_expiry"
>;

const TENANT_FORM_COLUMNS =
  "id, name, mobile_number, aadhaar_number, floor_number, monthly_rent, electricity_rate, agreement_expiry";

/**
 * The tenant behind the Edit Tenant form.
 *
 * Deleted rows are excluded, as in `fetchHouse`: the delete is soft, so the row
 * still reads back fine, but the tenant has disappeared from the app and editing
 * them would be a dead end. `.single()` turns that into an error the screen shows.
 */
export async function fetchTenantRecord(id: string): Promise<TenantRecord> {
  const { data, error } = await neon
    .from("tenants")
    .select(TENANT_FORM_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;

  return data;
}

/**
 * Saves an edited tenant.
 *
 * Addressed by id alone — RLS refuses to update a row the token does not own, so a
 * forged id changes nothing. `house_id` is not among the fields: moving someone to
 * another house is a different act from correcting their details, and the floor
 * they hold is only unique within one house.
 */
export async function updateTenant(
  id: string,
  tenant: TenantInput,
): Promise<void> {
  const { error } = await neon.from("tenants").update(tenant).eq("id", id);

  if (error) throw error;
}

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
