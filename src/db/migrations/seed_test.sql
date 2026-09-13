-- Verification fixture for 0001_init.sql. NOT part of the migration chain.
-- Seeds the exact numbers from requirements/Rent Track.txt for landlord A,
-- plus an unrelated landlord B, then simulates Data API requests to prove
-- Clerk-issued JWTs isolate the two.
--
-- Run as neondb_owner on a throwaway branch:
--   node /tmp/runsql.js @src/db/migrations/seed_test.sql
--
-- owner_id is passed explicitly here: auth.user_id() is NULL outside a real
-- Data API request, so the DEFAULT cannot fire for a psql-driven seed.
--
-- Clerk user ids are 'user_' + ~27 chars; the literals below are that shape.

BEGIN;

CREATE TABLE results (n int, name text, outcome text);
-- The isolation tests run as `authenticated`, which owns nothing here.
GRANT SELECT, INSERT ON results TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed landlord A: one 4-floor house, four tenants, four bills
-- ---------------------------------------------------------------------------
INSERT INTO users (id, mobile_number, default_upi_id, default_gpay_number)
VALUES ('user_2nQXaLandlordAaaaaaaaaaaaaa', '9910968146',
        'meeradevi.md85@okhdfcbank', '9910968146');
INSERT INTO users (id) VALUES ('user_2nQXbLandlordBbbbbbbbbbbbbb');

INSERT INTO houses (id, owner_id, name, address, number_of_floors,
                    upi_id, gpay_number)
VALUES ('01930000-0000-7000-8000-000000000001',
        'user_2nQXaLandlordAaaaaaaaaaaaaa',
        'Meera Niwas', 'Sector 12', 4,
        'meeradevi.md85@okhdfcbank', '9910968146');

INSERT INTO tenants (id, owner_id, house_id, name, floor_number,
                     monthly_rent, electricity_rate, opening_meter_reading)
VALUES
  ('01930000-0000-7000-8000-000000000010', 'user_2nQXaLandlordAaaaaaaaaaaaaa',
   '01930000-0000-7000-8000-000000000001', 'Ground Tenant', 0, 7000, 8, 0),
  ('01930000-0000-7000-8000-000000000011', 'user_2nQXaLandlordAaaaaaaaaaaaaa',
   '01930000-0000-7000-8000-000000000001', 'First Tenant',  1, 6000, 7, 8155),
  ('01930000-0000-7000-8000-000000000012', 'user_2nQXaLandlordAaaaaaaaaaaaaa',
   '01930000-0000-7000-8000-000000000001', 'Second Tenant', 2, 5600, 7, 4240),
  ('01930000-0000-7000-8000-000000000013', 'user_2nQXaLandlordAaaaaaaaaaaaaa',
   '01930000-0000-7000-8000-000000000001', 'Third Tenant',  3, 6000, 6, 4522);

INSERT INTO bills (id, owner_id, tenant_id, bill_month, rent_amount,
                   previous_reading, current_reading, electricity_rate,
                   previous_balance)
VALUES
  ('01930000-0000-7000-8000-000000000020', 'user_2nQXaLandlordAaaaaaaaaaaaaa',
   '01930000-0000-7000-8000-000000000010', DATE '2026-06-01', 7000,    0,   88, 8, 0),
  ('01930000-0000-7000-8000-000000000021', 'user_2nQXaLandlordAaaaaaaaaaaaaa',
   '01930000-0000-7000-8000-000000000011', DATE '2026-06-01', 6000, 8155, 8253, 7, 0.94),
  ('01930000-0000-7000-8000-000000000022', 'user_2nQXaLandlordAaaaaaaaaaaaaa',
   '01930000-0000-7000-8000-000000000012', DATE '2026-06-01', 5600, 4240, 4363, 7, 2884.14),
  ('01930000-0000-7000-8000-000000000023', 'user_2nQXaLandlordAaaaaaaaaaaaaa',
   '01930000-0000-7000-8000-000000000013', DATE '2026-06-01', 6000, 4522, 4651, 6, 0);

-- Extra charges: IGL (gas) and Water, per the requirements sheet.
INSERT INTO bill_charges (owner_id, bill_id, label, amount, sort_order)
VALUES
  ('user_2nQXaLandlordAaaaaaaaaaaaaa', '01930000-0000-7000-8000-000000000021', 'IGL',   1210.81, 0),
  ('user_2nQXaLandlordAaaaaaaaaaaaaa', '01930000-0000-7000-8000-000000000021', 'Water',  600.00, 1),
  ('user_2nQXaLandlordAaaaaaaaaaaaaa', '01930000-0000-7000-8000-000000000022', 'IGL',    756.69, 0),
  ('user_2nQXaLandlordAaaaaaaaaaaaaa', '01930000-0000-7000-8000-000000000022', 'Water',  600.00, 1),
  ('user_2nQXaLandlordAaaaaaaaaaaaaa', '01930000-0000-7000-8000-000000000023', 'Water',  600.00, 0);

-- A second house of A's with NO tenants. Test 23 needs a house where every
-- floor is free, otherwise the unique index on (house_id, floor_number) fires
-- first and the test passes for the wrong reason instead of exercising the FK.
INSERT INTO houses (id, owner_id, name, number_of_floors)
VALUES ('01930000-0000-7000-8000-000000000002',
        'user_2nQXaLandlordAaaaaaaaaaaaaa', 'Meera Annexe', 4);

-- Landlord B: unrelated 2-floor house, used as the intruder below.
INSERT INTO houses (id, owner_id, name, number_of_floors)
VALUES ('01930000-0000-7000-8000-0000000000b1',
        'user_2nQXbLandlordBbbbbbbbbbbbbb', 'Other Bhawan', 2);

COMMIT;

-- ---------------------------------------------------------------------------
-- Arithmetic: must match requirements/Rent Track.txt exactly
-- ---------------------------------------------------------------------------
INSERT INTO results
SELECT 1, 'bill totals 7704 / 8497.75 / 10701.83 / 7374',
       CASE WHEN array_agg(total_billed ORDER BY floor_number)
                 = ARRAY[7704, 8497.75, 10701.83, 7374]::numeric(12,2)[]
            THEN 'PASS'
            ELSE 'FAIL ' || array_agg(total_billed ORDER BY floor_number)::text END
  FROM v_bill_receipt;

INSERT INTO results
SELECT 2, 'total units 438',
       CASE WHEN sum(units_consumed) = 438 THEN 'PASS'
            ELSE 'FAIL ' || sum(units_consumed)::text END FROM v_bill_receipt;

INSERT INTO results
SELECT 3, 'total electricity 3025',
       CASE WHEN sum(electricity_amount) = 3025 THEN 'PASS'
            ELSE 'FAIL ' || sum(electricity_amount)::text END FROM v_bill_receipt;

INSERT INTO results
SELECT 4, 'total billed 34277.58',
       CASE WHEN sum(total_billed) = 34277.58 THEN 'PASS'
            ELSE 'FAIL ' || sum(total_billed)::text END FROM v_bill_receipt;

INSERT INTO results
SELECT 5, 'extra_charges_total synced by trigger',
       CASE WHEN (SELECT extra_charges_total FROM bills
                   WHERE id = '01930000-0000-7000-8000-000000000021') = 1810.81
            THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO results
SELECT 6, 'carry_forward_balance() sees June for July',
       CASE WHEN carry_forward_balance(
                   '01930000-0000-7000-8000-000000000012', DATE '2026-07-01')
                 = 10701.83 THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO results
SELECT 7, 'next_previous_reading() continues the meter',
       CASE WHEN next_previous_reading(
                   '01930000-0000-7000-8000-000000000012', DATE '2026-07-01')
                 = 4363 THEN 'PASS' ELSE 'FAIL' END;

-- ---------------------------------------------------------------------------
-- The reason user ids are text: auth.uid() cannot parse a Clerk sub
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'user_2nQXaLandlordAaaaaaaaaaaaaa')::text, false);

INSERT INTO results
SELECT 8, 'auth.user_id() returns the Clerk sub',
       CASE WHEN auth.user_id() = 'user_2nQXaLandlordAaaaaaaaaaaaaa'
            THEN 'PASS' ELSE 'FAIL ' || coalesce(auth.user_id(), '<null>') END;

DO $$
DECLARE u uuid;
BEGIN
  u := auth.uid();
  INSERT INTO results VALUES (9, 'auth.uid() unusable for a Clerk sub',
    CASE WHEN u IS NULL THEN 'PASS (returns NULL)'
         ELSE 'FAIL ' || u::text END);
EXCEPTION WHEN others THEN
  INSERT INTO results VALUES (9, 'auth.uid() unusable for a Clerk sub',
    'PASS (raises ' || SQLSTATE || ')');
END $$;

-- ---------------------------------------------------------------------------
-- Tenant isolation, as the Data API would run it: landlord B's JWT
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'user_2nQXbLandlordBbbbbbbbbbbbbb')::text, false);
SET ROLE authenticated;

INSERT INTO results SELECT 10, 'B sees 0 of A''s houses',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM houses
  WHERE id = '01930000-0000-7000-8000-000000000001';
INSERT INTO results SELECT 11, 'B sees 0 of A''s tenants',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM tenants;
INSERT INTO results SELECT 12, 'B sees 0 of A''s bills',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM bills;
INSERT INTO results SELECT 13, 'B sees 0 of A''s bill_charges',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM bill_charges;
INSERT INTO results SELECT 14, 'B sees only its own house',
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM houses;
INSERT INTO results SELECT 15, 'B sees only its own users row',
  CASE WHEN count(*) = 1 AND min(id) = 'user_2nQXbLandlordBbbbbbbbbbbbbb'
       THEN 'PASS' ELSE 'FAIL' END FROM users;

-- Views must not leak: security_invoker makes them run as the caller.
INSERT INTO results SELECT 16, 'v_bill_receipt leaks nothing to B',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM v_bill_receipt;
INSERT INTO results SELECT 17, 'v_tenant_list leaks nothing to B',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM v_tenant_list;
INSERT INTO results SELECT 18, 'v_house_month_summary leaks nothing to B',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM v_house_month_summary;
INSERT INTO results SELECT 19, 'v_house_list shows B only its own',
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL ' || count(*) END FROM v_house_list;

-- B cannot forge ownership on write.
DO $$ BEGIN
  INSERT INTO houses (owner_id, name)
  VALUES ('user_2nQXaLandlordAaaaaaaaaaaaaa', 'stolen');
  INSERT INTO results VALUES (20, 'B cannot insert a house owned by A', 'FAIL: allowed');
EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO results VALUES (20, 'B cannot insert a house owned by A', 'PASS (rls)');
END $$;

DO $$
DECLARE n int;
BEGIN
  UPDATE houses SET name = 'hijacked'
   WHERE id = '01930000-0000-7000-8000-000000000001';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO results VALUES (21, 'B cannot update A''s house',
    CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL ' || n END);
END $$;

DO $$
DECLARE n int;
BEGIN
  DELETE FROM bills;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO results VALUES (22, 'B cannot delete A''s bills',
    CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL ' || n END);
END $$;

-- The composite FK, not just RLS, blocks cross-owner references.
-- Targets A's EMPTY house on a free floor, so a unique_violation here would be
-- a bug in the test rather than a pass.
DO $$ BEGIN
  INSERT INTO tenants (owner_id, house_id, name, floor_number)
  VALUES ('user_2nQXbLandlordBbbbbbbbbbbbbb',
          '01930000-0000-7000-8000-000000000002', 'infiltrator', 0);
  INSERT INTO results VALUES (23,
    'composite FK blocks tenant in A''s house under B', 'FAIL: allowed');
EXCEPTION
  WHEN foreign_key_violation THEN
    INSERT INTO results VALUES (23,
      'composite FK blocks tenant in A''s house under B', 'PASS (fk)');
  WHEN insufficient_privilege THEN
    INSERT INTO results VALUES (23,
      'composite FK blocks tenant in A''s house under B', 'PASS (rls)');
  WHEN unique_violation THEN
    INSERT INTO results VALUES (23,
      'composite FK blocks tenant in A''s house under B',
      'INCONCLUSIVE: unique index fired, pick a free floor');
END $$;

DO $$ BEGIN
  -- B's own house, free floor 0 — so only the FK can stop the bill below,
  -- not the unique index on (house_id, floor_number).
  INSERT INTO tenants (owner_id, house_id, name, floor_number, monthly_rent)
  VALUES ('user_2nQXbLandlordBbbbbbbbbbbbbb',
          '01930000-0000-7000-8000-0000000000b1', 'B tenant', 0, 1000);
  -- August, which A has not billed: bills_tenant_month_key must not be what
  -- rejects this, or the test would pass without exercising the FK.
  INSERT INTO bills (owner_id, tenant_id, bill_month, rent_amount)
  VALUES ('user_2nQXbLandlordBbbbbbbbbbbbbb',
          '01930000-0000-7000-8000-000000000010', DATE '2026-08-01', 1);
  INSERT INTO results VALUES (24,
    'composite FK blocks bill against A''s tenant', 'FAIL: allowed');
EXCEPTION
  WHEN foreign_key_violation THEN
    INSERT INTO results VALUES (24,
      'composite FK blocks bill against A''s tenant', 'PASS (fk)');
  WHEN unique_violation THEN
    INSERT INTO results VALUES (24,
      'composite FK blocks bill against A''s tenant',
      'INCONCLUSIVE: unique index fired, pick an unbilled month');
END $$;

-- ensure_profile() must create exactly the caller's own row, idempotently.
RESET ROLE;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'user_2nQXcBrandNewSignupZzzzzzz')::text, false);
SET ROLE authenticated;

DO $$
DECLARE p users; n int;
BEGIN
  p := ensure_profile();
  p := ensure_profile();           -- second call must be a no-op
  SELECT count(*) INTO n FROM users;
  INSERT INTO results VALUES (25, 'ensure_profile() idempotent, own row only',
    CASE WHEN p.id = 'user_2nQXcBrandNewSignupZzzzzzz' AND n = 1
         THEN 'PASS'
         ELSE 'FAIL id=' || coalesce(p.id, '<null>') || ' visible=' || n END);
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, false);

SELECT n, name, outcome FROM results ORDER BY n;
