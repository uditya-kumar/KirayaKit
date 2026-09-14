-- Rentica — initial schema for Lakebase Postgres on Neon (PostgreSQL 18)
--
-- Model: a user (landlord) owns houses; each house has floors, each floor is
-- occupied by a tenant. Every month a tenant gets one bill made of
-- rent + electricity (meter delta x rate) + extra charges + carried balance.
--
-- Auth: Clerk issues the JWT, the Neon Data API validates it against Clerk's
-- JWKS, and RLS does the rest. User ids are therefore `text`, not `uuid`:
-- Clerk's `sub` claim looks like 'user_2abc...', so auth.uid() (which parses
-- sub as a uuid) would return NULL and every policy would silently match zero
-- rows. auth.user_id() returns the raw sub as text — always use that one.
--
-- Apply over a DIRECT (non-pooled) connection — strip `-pooler` from the host,
-- or use DATABASE_URL_UNPOOLED:
--   psql "$DATABASE_URL_UNPOOLED" -f 0001_init.sql
-- Test on a throwaway Neon branch first (create it in the console), never
-- straight onto the default branch. After applying, refresh the Data API
-- schema cache (NOTIFY pgrst, 'reload schema') or new tables 404.
--
-- Neon grants `authenticated` EXECUTE on auth.user_id() but NOT USAGE on the
-- `auth` schema itself. Stored expressions (column DEFAULTs, RLS policies,
-- views) resolve the function once at definition time and are unaffected. Only
-- a body that resolves names at run time — i.e. plpgsql — hits the missing
-- grant, so auth.user_id() must never appear inside one. See ensure_profile()
-- for the way around it.
--
-- Every table carries owner_id so Row-Level Security is a single indexed
-- comparison with no joins. Composite foreign keys (id, owner_id) keep that
-- denormalised key honest: a tenant cannot point at another user's house.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- "Search property/tenant by name"

-- ---------------------------------------------------------------------------
-- users — app profile for the landlord, keyed by the Clerk user id.
-- Clerk owns name/email/avatar; fetch those client-side with useUser(). This
-- table holds only what Rentica adds on top.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             text PRIMARY KEY DEFAULT auth.user_id(),
  mobile_number  text,
  -- defaults offered when creating a house; each house may override
  default_upi_id      text,
  default_gpay_number text,
  currency       char(3) NOT NULL DEFAULT 'INR',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_id_not_blank CHECK (length(btrim(id)) > 0)
);

-- ---------------------------------------------------------------------------
-- houses — a property. UPI / GPay live here because the shared receipt
-- quotes the payment handle of the house the tenant lives in.
-- ---------------------------------------------------------------------------
CREATE TABLE houses (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_id         text NOT NULL DEFAULT auth.user_id()
                     REFERENCES users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  address          text,
  number_of_floors smallint NOT NULL DEFAULT 1,
  upi_id           text,
  gpay_number      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,

  CONSTRAINT houses_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT houses_floors_sane    CHECK (number_of_floors BETWEEN 1 AND 50),
  -- referenced by the composite FK on tenants
  CONSTRAINT houses_id_owner_key   UNIQUE (id, owner_id)
);

CREATE INDEX houses_owner_idx ON houses (owner_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX houses_owner_name_key
  ON houses (owner_id, lower(name)) WHERE deleted_at IS NULL;
-- Trigram index for the Home screen's "Search property by name" (ILIKE '%x%').
-- Verified usable, but it only beats a seq scan past a few hundred rows per
-- owner; with a handful of houses per landlord you can drop this and the
-- tenants one below and filter client-side.
CREATE INDEX houses_name_trgm_idx ON houses USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- tenants — occupant of one floor.
-- floor_number: 0 = Ground Floor, 1 = 1st Floor, ... (label built in the app)
-- rent and electricity_rate are per tenant: the requirements sheet shows
-- Rs.8 / Rs.7 / Rs.7 / Rs.6 per unit across four floors of one house.
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_id              text NOT NULL DEFAULT auth.user_id(),
  house_id              uuid NOT NULL,
  name                  text NOT NULL,
  mobile_number         text,
  aadhaar_number        text,
  floor_number          smallint NOT NULL,
  monthly_rent          numeric(12,2) NOT NULL DEFAULT 0,
  electricity_rate      numeric(10,2) NOT NULL DEFAULT 0,
  opening_meter_reading numeric(12,2) NOT NULL DEFAULT 0,
  agreement_expiry      date,
  moved_in_on           date NOT NULL DEFAULT current_date,
  moved_out_on          date,
  is_active             boolean NOT NULL DEFAULT true,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,

  CONSTRAINT tenants_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT tenants_floor_non_neg  CHECK (floor_number >= 0),
  CONSTRAINT tenants_money_non_neg  CHECK (monthly_rent >= 0
                                       AND electricity_rate >= 0
                                       AND opening_meter_reading >= 0),
  CONSTRAINT tenants_aadhaar_shape  CHECK (aadhaar_number IS NULL
                                       OR aadhaar_number ~ '^[0-9]{12}$'),
  CONSTRAINT tenants_tenure_order   CHECK (moved_out_on IS NULL
                                       OR moved_out_on >= moved_in_on),
  -- the tenant's owner must be the house's owner
  CONSTRAINT tenants_house_fk FOREIGN KEY (house_id, owner_id)
    REFERENCES houses (id, owner_id) ON DELETE CASCADE,
  CONSTRAINT tenants_id_owner_key UNIQUE (id, owner_id)
);

-- owner_id leads every composite index: RLS puts an owner_id predicate on
-- every query, so an owner-leading index serves both the policy and the
-- lookup. Verified with EXPLAIN — a house_id-leading index went unused.
CREATE INDEX tenants_owner_house_idx
  ON tenants (owner_id, house_id) WHERE deleted_at IS NULL;
CREATE INDEX tenants_name_trgm_idx ON tenants USING gin (name gin_trgm_ops);
-- One active tenant per floor; previous occupants stay in history.
CREATE UNIQUE INDEX tenants_active_floor_key
  ON tenants (house_id, floor_number) WHERE is_active AND deleted_at IS NULL;
-- Agreement-expiry reminders.
CREATE INDEX tenants_expiry_idx
  ON tenants (agreement_expiry) WHERE is_active AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- bills — one row per tenant per month (the "Edit Bill" screen).
--
-- units_consumed / electricity_amount / total_billed are STORED generated
-- columns: the app can never disagree with the receipt. They are STORED, not
-- PG18's new VIRTUAL default, because virtual columns cannot be indexed.
-- Postgres forbids one generated column referencing another, so the
-- electricity term is spelled out again inside total_billed — change the rate
-- arithmetic in one and you must change the other.
-- balance_due and status depend on total_billed, so they live in v_bill_receipt.
-- ---------------------------------------------------------------------------
CREATE TABLE bills (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_id            text NOT NULL DEFAULT auth.user_id(),
  tenant_id           uuid NOT NULL,
  bill_month          date NOT NULL,          -- always the 1st of the month

  rent_amount         numeric(12,2) NOT NULL DEFAULT 0,
  previous_reading    numeric(12,2) NOT NULL DEFAULT 0,
  current_reading     numeric(12,2) NOT NULL DEFAULT 0,
  -- rate snapshotted at billing time, so editing a tenant never rewrites history
  electricity_rate    numeric(10,2) NOT NULL DEFAULT 0,
  -- kept equal to SUM(bill_charges.amount) by trigger
  extra_charges_total numeric(12,2) NOT NULL DEFAULT 0,
  -- unpaid amount carried from the previous month ("prev" in the requirements)
  previous_balance    numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid         numeric(12,2) NOT NULL DEFAULT 0,

  units_consumed      numeric(12,2)
    GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  electricity_amount  numeric(12,2)
    GENERATED ALWAYS AS (round((current_reading - previous_reading)
                               * electricity_rate, 2)) STORED,
  total_billed        numeric(12,2)
    GENERATED ALWAYS AS (round(rent_amount
                             + (current_reading - previous_reading) * electricity_rate
                             + extra_charges_total
                             + previous_balance, 2)) STORED,

  paid_on             date,
  payment_method      text,
  shared_at           timestamptz,   -- receipt shared over WhatsApp
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bills_month_is_first CHECK (bill_month = date_trunc('month', bill_month)::date),
  CONSTRAINT bills_reading_forward CHECK (current_reading >= previous_reading),
  CONSTRAINT bills_money_non_neg   CHECK (rent_amount >= 0
                                      AND electricity_rate >= 0
                                      AND amount_paid >= 0),
  CONSTRAINT bills_method_known    CHECK (payment_method IS NULL
    OR payment_method IN ('upi', 'gpay', 'cash', 'bank', 'other')),
  CONSTRAINT bills_tenant_fk FOREIGN KEY (tenant_id, owner_id)
    REFERENCES tenants (id, owner_id) ON DELETE CASCADE,
  CONSTRAINT bills_tenant_month_key UNIQUE (tenant_id, bill_month),
  CONSTRAINT bills_id_owner_key     UNIQUE (id, owner_id)
);

-- Serves Payment History (one tenant, newest first), "latest bill", and the
-- RLS owner predicate from a single index.
CREATE INDEX bills_owner_tenant_month_idx
  ON bills (owner_id, tenant_id, bill_month DESC);
-- Outstanding bills only — small, and the Tenants list hits it constantly.
CREATE INDEX bills_unsettled_idx ON bills (owner_id, tenant_id)
  WHERE amount_paid < total_billed;

-- ---------------------------------------------------------------------------
-- bill_charges — the "Extra charges (Optional)" rows: Water, IGL (gas), or
-- whatever the user adds with "Add charge".
-- ---------------------------------------------------------------------------
CREATE TABLE bill_charges (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_id   text NOT NULL DEFAULT auth.user_id(),
  bill_id    uuid NOT NULL,
  label      text NOT NULL,
  amount     numeric(12,2) NOT NULL DEFAULT 0,
  sort_order smallint NOT NULL DEFAULT 0,

  CONSTRAINT bill_charges_label_not_blank CHECK (length(btrim(label)) > 0),
  CONSTRAINT bill_charges_amount_non_neg  CHECK (amount >= 0),
  CONSTRAINT bill_charges_bill_fk FOREIGN KEY (bill_id, owner_id)
    REFERENCES bills (id, owner_id) ON DELETE CASCADE
);

CREATE INDEX bill_charges_bill_idx ON bill_charges (bill_id, sort_order);

-- Charge labels this house has used before, to prefill "Add charge".
CREATE TABLE charge_presets (
  id       uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_id text NOT NULL DEFAULT auth.user_id(),
  house_id uuid NOT NULL,
  label    text NOT NULL,
  amount   numeric(12,2) NOT NULL DEFAULT 0,

  CONSTRAINT charge_presets_label_not_blank CHECK (length(btrim(label)) > 0),
  CONSTRAINT charge_presets_house_fk FOREIGN KEY (house_id, owner_id)
    REFERENCES houses (id, owner_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX charge_presets_house_label_key
  ON charge_presets (house_id, lower(label));

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_touch   BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER houses_touch  BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tenants_touch BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER bills_touch   BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Keep bills.extra_charges_total equal to SUM(bill_charges.amount).
CREATE FUNCTION sync_bill_extra_charges() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  target uuid;
BEGIN
  FOREACH target IN ARRAY (
    SELECT array_agg(DISTINCT b) FILTER (WHERE b IS NOT NULL)
    FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.bill_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.bill_id END
    ]) AS b
  )
  LOOP
    UPDATE bills
       SET extra_charges_total = COALESCE(
             (SELECT sum(amount) FROM bill_charges WHERE bill_id = target), 0)
     WHERE id = target;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE TRIGGER bill_charges_sync
AFTER INSERT OR UPDATE OF amount, bill_id OR DELETE ON bill_charges
FOR EACH ROW EXECUTE FUNCTION sync_bill_extra_charges();

-- A tenant must sit on a floor the house actually has.
CREATE FUNCTION check_tenant_floor() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  floors smallint;
BEGIN
  SELECT number_of_floors INTO floors FROM houses WHERE id = NEW.house_id;
  IF NEW.floor_number >= floors THEN
    RAISE EXCEPTION
      'floor % does not exist in this house (it has % floors: 0..%)',
      NEW.floor_number, floors, floors - 1
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenants_floor_range
BEFORE INSERT OR UPDATE OF floor_number, house_id ON tenants
FOR EACH ROW EXECUTE FUNCTION check_tenant_floor();

-- ---------------------------------------------------------------------------
-- Helpers for the Edit Bill screen
-- ---------------------------------------------------------------------------

-- Meter reading the next bill should start from: last bill's current reading,
-- else the tenant's opening reading.
CREATE FUNCTION next_previous_reading(p_tenant uuid, p_month date)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT b.current_reading FROM bills b
      WHERE b.tenant_id = p_tenant AND b.bill_month < p_month
      ORDER BY b.bill_month DESC LIMIT 1),
    (SELECT t.opening_meter_reading FROM tenants t WHERE t.id = p_tenant),
    0);
$$;

-- Unpaid amount to carry into p_month ("Previous balance carried").
CREATE FUNCTION carry_forward_balance(p_tenant uuid, p_month date)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT COALESCE(sum(b.total_billed - b.amount_paid), 0)
    FROM bills b
   WHERE b.tenant_id = p_tenant AND b.bill_month < p_month;
$$;

-- Call once after every Clerk sign-in. houses.owner_id references users(id),
-- so the profile row has to exist before the first house can be created.
--
-- The body must not name auth.user_id() itself, which rules out both of the
-- obvious shapes. Verified against the live Data API, not guessed:
--   * plpgsql + SECURITY INVOKER resolves the name on every call and dies with
--     "permission denied for schema auth" — Neon grants `authenticated`
--     EXECUTE on auth.user_id() but not USAGE on the schema that holds it.
--   * plpgsql + SECURITY DEFINER clears that privilege check but then reads
--     `request.jwt.claims` as empty, so auth.user_id() comes back NULL and the
--     function cannot tell who is calling.
-- A SQL-standard body (BEGIN ATOMIC) sidesteps both: it is parsed and stored as
-- a tree at definition time, exactly like a view or a column default, so there
-- is no run-time name lookup — and the caller's id arrives through the DEFAULT
-- on users.id instead of a call inside the body.
--
-- SECURITY INVOKER (the default) is deliberate: RLS still applies, and the
-- WITH CHECK on users_own_row is what guarantees a caller can only ever create
-- the row belonging to their own Clerk id.
CREATE FUNCTION ensure_profile() RETURNS users
LANGUAGE sql
BEGIN ATOMIC
  INSERT INTO users AS u DEFAULT VALUES
  ON CONFLICT (id) DO UPDATE SET updated_at = now()
  RETURNING u.*;
END;

-- Functions are executable by PUBLIC by default; only signed-in callers have
-- any business creating a profile. `authenticated` is granted below.
REVOKE EXECUTE ON FUNCTION ensure_profile() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Views for the screens.
-- security_invoker = true is REQUIRED: without it a view runs as its owner and
-- silently bypasses the RLS policies below.
-- ---------------------------------------------------------------------------

-- Home: house cards with their active tenant count.
CREATE VIEW v_house_list WITH (security_invoker = true) AS
SELECT h.id, h.owner_id, h.name, h.address, h.number_of_floors,
       h.upi_id, h.gpay_number,
       count(t.id) AS tenant_count
  FROM houses h
  LEFT JOIN tenants t
    ON t.house_id = h.id AND t.is_active AND t.deleted_at IS NULL
 WHERE h.deleted_at IS NULL
 GROUP BY h.id;

-- Tenants list + Tenant Detail: rent, rate, and total pending.
CREATE VIEW v_tenant_list WITH (security_invoker = true) AS
SELECT t.id, t.owner_id, t.house_id, h.name AS house_name,
       t.name, t.floor_number, t.mobile_number,
       t.monthly_rent, t.electricity_rate, t.agreement_expiry, t.is_active,
       COALESCE(b.total_pending, 0) AS total_pending,
       b.last_bill_month
  FROM tenants t
  JOIN houses h ON h.id = t.house_id
  LEFT JOIN LATERAL (
    SELECT sum(bl.total_billed - bl.amount_paid) AS total_pending,
           max(bl.bill_month)                    AS last_bill_month
      FROM bills bl WHERE bl.tenant_id = t.id
  ) b ON true
 WHERE t.deleted_at IS NULL;

-- Bill Details receipt and Payment History rows.
CREATE VIEW v_bill_receipt WITH (security_invoker = true) AS
SELECT b.id, b.owner_id, b.bill_month,
       t.id AS tenant_id, t.name AS tenant_name, t.floor_number,
       h.id AS house_id, h.name AS house_name, h.upi_id, h.gpay_number,
       b.rent_amount, b.units_consumed, b.electricity_rate, b.electricity_amount,
       b.extra_charges_total, b.previous_balance, b.total_billed, b.amount_paid,
       b.total_billed - b.amount_paid AS balance_due,
       CASE
         WHEN b.amount_paid <= 0                 THEN 'unpaid'
         WHEN b.amount_paid >= b.total_billed    THEN 'paid'
         ELSE 'partial'
       END AS status,
       b.paid_on, b.payment_method, b.shared_at
  FROM bills b
  JOIN tenants t ON t.id = b.tenant_id
  JOIN houses  h ON h.id = t.house_id;

-- Per-house monthly totals (the summary lines at the end of the requirements).
CREATE VIEW v_house_month_summary WITH (security_invoker = true) AS
SELECT h.id AS house_id, h.owner_id, b.bill_month,
       count(*)                        AS bill_count,
       sum(b.rent_amount)              AS total_rent,
       sum(b.units_consumed)           AS total_units,
       sum(b.electricity_amount)       AS total_electricity,
       sum(b.extra_charges_total)      AS total_extra_charges,
       sum(b.total_billed)             AS total_billed,
       sum(b.amount_paid)              AS total_collected,
       sum(b.total_billed - b.amount_paid) AS total_pending
  FROM bills b
  JOIN tenants t ON t.id = b.tenant_id
  JOIN houses  h ON h.id = t.house_id
 GROUP BY h.id, h.owner_id, b.bill_month;

-- ---------------------------------------------------------------------------
-- Row-Level Security — required by the Data API. RLS enabled with no policy
-- blocks everything, so every table gets exactly one owner policy.
--
-- auth.user_id() returns the JWT `sub` claim as text — Clerk's user id.
-- It is wrapped in a sub-select so the planner evaluates it once per query
-- as an InitPlan instead of once per row.
-- ---------------------------------------------------------------------------

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_charges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_row ON users FOR ALL TO authenticated
  USING ((select auth.user_id()) = id)
  WITH CHECK ((select auth.user_id()) = id);

CREATE POLICY houses_owner ON houses FOR ALL TO authenticated
  USING ((select auth.user_id()) = owner_id)
  WITH CHECK ((select auth.user_id()) = owner_id);

CREATE POLICY tenants_owner ON tenants FOR ALL TO authenticated
  USING ((select auth.user_id()) = owner_id)
  WITH CHECK ((select auth.user_id()) = owner_id);

CREATE POLICY bills_owner ON bills FOR ALL TO authenticated
  USING ((select auth.user_id()) = owner_id)
  WITH CHECK ((select auth.user_id()) = owner_id);

CREATE POLICY bill_charges_owner ON bill_charges FOR ALL TO authenticated
  USING ((select auth.user_id()) = owner_id)
  WITH CHECK ((select auth.user_id()) = owner_id);

CREATE POLICY charge_presets_owner ON charge_presets FOR ALL TO authenticated
  USING ((select auth.user_id()) = owner_id)
  WITH CHECK ((select auth.user_id()) = owner_id);

-- ---------------------------------------------------------------------------
-- Grants. The Data API picks the role from the JWT: `authenticated` for a
-- signed-in user, `anonymous` otherwise. Rentica has no public data, so
-- `anonymous` is granted nothing.
--
-- The Clerk token MUST carry `"role": "authenticated"`. The Data API reads
-- jwt_role_claim_key '.role' and falls back to db_anon_role (`anonymous`) when
-- the claim is absent — a perfectly valid signed-in JWT then gets 403
-- "permission denied" on every table. Clerk does not add it by default; it
-- comes from Dashboard -> Sessions -> Customize session token, set to
-- {"role": "authenticated"}. That setting is part of this schema's contract:
-- clear it and the whole app goes read-nothing.
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON users, houses, tenants, bills, bill_charges, charge_presets
  TO authenticated;
GRANT SELECT
  ON v_house_list, v_tenant_list, v_bill_receipt, v_house_month_summary
  TO authenticated;
GRANT EXECUTE ON FUNCTION next_previous_reading(uuid, date),
                          carry_forward_balance(uuid, date),
                          ensure_profile() TO authenticated;

COMMIT;
