-- KirayaKit — development seed data.
--
-- Run it with:  npm run seed-dev [clerk_user_id]
-- (with no argument it seeds the most recently created users row, i.e. whoever
-- signed up last — see scripts/seed-dev.mjs).
--
-- Idempotent: it deletes the owner's existing houses first, which cascades to
-- tenants, bills, bill_charges and charge_presets. Re-run it as often as you
-- like; it never touches another owner's rows.
--
-- Values come from requirements/design file (the Pencil mock): the four houses,
-- "Mr. Piyush" on the ground floor, "Mr. Rakesh" on the 3rd floor of Meera
-- Residency, rent 5,000, electricity 6/unit, 129 units, water charge 600,
-- IGL (Gas) 0, total 6,374. Rakesh's previous-month bill reproduces that
-- receipt exactly so the receipt screen can be diffed against the mock.
--
-- Two deliberate departures from the mock:
--   * Months are relative to current_date, not the mock's literal Feb 2026, so
--     the "Current Month" sections always have data no matter when you run it.
--   * The mock shows Billed 5,000 / Paid 5,600 on the same card, which cannot
--     both be true. Payments here are internally consistent instead, and spread
--     across paid / part-paid / unpaid so every UI state has a row to render.
--
-- Floors are 0-indexed: check_tenant_floor() rejects floor_number >= the
-- house's number_of_floors, so a 4-floor house has floors 0,1,2,3 and "Ground
-- Floor" is 0.
--
-- The owner is read from a session setting rather than hardcoded:
--   SET app.seed_owner = '<clerk user id>';

-- ---------------------------------------------------------------------------
-- Wipe this owner's data
-- ---------------------------------------------------------------------------
DELETE FROM houses WHERE owner_id = current_setting('app.seed_owner');

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------
INSERT INTO users (id, mobile_number, default_upi_id, default_gpay_number, currency)
VALUES (current_setting('app.seed_owner'), '+919810022101',
        'landlord@okhdfcbank', '+919810022101', 'INR')
ON CONFLICT (id) DO UPDATE
   SET mobile_number       = EXCLUDED.mobile_number,
       default_upi_id      = EXCLUDED.default_upi_id,
       default_gpay_number = EXCLUDED.default_gpay_number,
       updated_at          = now();

-- ---------------------------------------------------------------------------
-- Houses. number_of_floors is set so every tenant below has a legal floor.
-- ---------------------------------------------------------------------------
INSERT INTO houses (owner_id, name, address, number_of_floors, upi_id, gpay_number)
SELECT current_setting('app.seed_owner'), v.name, v.address, v.floors, v.upi, v.gpay
  FROM (VALUES
    ('Meera Residency',    'Sector 12, Dwarka',  4::smallint, 'meera.residency@okicici', '+919810022101'),
    ('Lotus Villa',        'Greater Kailash II', 3::smallint, 'lotus.villa@okaxis',      NULL),
    ('Sunrise Apartments', 'Rohini, Block C',    6::smallint, NULL,                      '+919810022102'),
    ('Green Nest',         'Vasant Kunj',        2::smallint, 'greennest@oksbi',         NULL),
    ('Shanti Kunj',        'Pitampura, Block A', 3::smallint, 'shantikunj@okpaytm',      NULL),
    ('Ashoka Heights',     'Mayur Vihar Ph. 1',  5::smallint, NULL,                      '+919810022103')
  ) AS v(name, address, floors, upi, gpay);

-- ---------------------------------------------------------------------------
-- Tenants. 23 active — 4/3/6/2 on the four houses the mock draws (v_house_list
-- counts only active, non-deleted tenants), then 3/5 on the two extra ones —
-- plus one moved-out tenant so the inactive state has a row.
-- ---------------------------------------------------------------------------
INSERT INTO tenants (owner_id, house_id, name, mobile_number, aadhaar_number,
                     floor_number, monthly_rent, electricity_rate,
                     opening_meter_reading, agreement_expiry, moved_in_on,
                     moved_out_on, is_active, notes)
SELECT current_setting('app.seed_owner'), h.id, v.name, v.mobile, v.aadhaar,
       v.floor, v.rent, v.rate, v.opening,
       CASE WHEN v.expiry_months IS NULL THEN NULL
            ELSE (current_date + (v.expiry_months || ' months')::interval)::date END,
       (date_trunc('month', current_date) - (v.tenure_months || ' months')::interval)::date,
       CASE WHEN v.active THEN NULL
            ELSE (date_trunc('month', current_date) - interval '2 months')::date END,
       v.active, v.notes
  FROM (VALUES
    -- house,               name,                 mobile,          aadhaar,        floor, rent,    rate,   opening, expiry, tenure, active, notes
    ('Meera Residency',    'Mr. Piyush',         '+919811100201', '901234567890', 0::smallint,  5000::numeric, 6::numeric,    1200::numeric, 8,    14, true,  NULL),
    ('Meera Residency',    'Mrs. Sunita Devi',   '+919811100202', NULL,           1::smallint,  5500::numeric, 6::numeric,    2450::numeric, 2,    22, true,  'Pays in cash, prefers a printed receipt.'),
    ('Meera Residency',    'Mr. Imran Khan',     '+919811100203', NULL,           2::smallint,  6000::numeric, 6::numeric,     980::numeric, NULL,  9, true,  NULL),
    ('Meera Residency',    'Mr. Rakesh',         '+919811100204', '556677889900', 3::smallint,  5000::numeric, 6::numeric,    3100::numeric, 11,   30, true,  NULL),
    ('Meera Residency',    'Mr. Sanjay Gupta',   '+919811100205', NULL,           3::smallint,  4800::numeric, 6::numeric,    2600::numeric, NULL, 29, false, 'Vacated; deposit settled in full.'),
    ('Lotus Villa',        'Mr. Deepak Verma',   '+919811100301', NULL,           0::smallint,  7200::numeric, 7::numeric,     640::numeric, 5,    11, true,  NULL),
    ('Lotus Villa',        'Ms. Anjali Nair',    '+919811100302', NULL,           1::smallint,  7800::numeric, 7::numeric,    1510::numeric, NULL, 18, true,  NULL),
    ('Lotus Villa',        'Mr. Harpreet Singh', '+919811100303', NULL,           2::smallint,  8100::numeric, 7::numeric,    2260::numeric, 1,     7, true,  'Agreement renewal due.'),
    ('Sunrise Apartments', 'Mr. Ramesh Yadav',   '+919811100401', NULL,           0::smallint,  4200::numeric, 5.5::numeric,   300::numeric, NULL, 26, true,  NULL),
    ('Sunrise Apartments', 'Mrs. Kavita Joshi',  '+919811100402', NULL,           1::smallint,  4400::numeric, 5.5::numeric,   720::numeric, 6,    13, true,  NULL),
    ('Sunrise Apartments', 'Mr. Nitin Bansal',   '+919811100403', NULL,           2::smallint,  4600::numeric, 5.5::numeric,  1180::numeric, NULL,  4, true,  NULL),
    ('Sunrise Apartments', 'Ms. Fatima Sheikh',  '+919811100404', NULL,           3::smallint,  4800::numeric, 5.5::numeric,  1640::numeric, 9,    16, true,  NULL),
    ('Sunrise Apartments', 'Mr. Suresh Patil',   '+919811100405', NULL,           4::smallint,  5000::numeric, 5.5::numeric,  2090::numeric, NULL, 20, true,  NULL),
    ('Sunrise Apartments', 'Mr. Arjun Mehta',    '+919811100406', NULL,           5::smallint,  5200::numeric, 5.5::numeric,  2530::numeric, 3,     6, true,  'New tenant, first bill this month.'),
    ('Green Nest',         'Mrs. Lakshmi Iyer',  '+919811100501', NULL,           0::smallint,  9500::numeric, 8::numeric,     410::numeric, NULL, 24, true,  NULL),
    ('Green Nest',         'Mr. Vikram Chauhan', '+919811100502', NULL,           1::smallint, 10500::numeric, 8::numeric,    1220::numeric, 4,    10, true,  NULL),
    ('Shanti Kunj',        'Mr. Mohit Ahuja',    '+919811100601', '223344556677', 0::smallint,  6300::numeric, 6.5::numeric,   870::numeric, 7,    15, true,  NULL),
    ('Shanti Kunj',        'Mrs. Rekha Pillai',  '+919811100602', NULL,           1::smallint,  6600::numeric, 6.5::numeric,  1930::numeric, NULL, 21, true,  'Rent transferred by her son every month.'),
    ('Shanti Kunj',        'Mr. Tarun Saxena',   '+919811100603', NULL,           2::smallint,  6900::numeric, 6.5::numeric,   540::numeric, 2,     5, true,  NULL),
    ('Ashoka Heights',     'Mr. Zaid Ansari',    '+919811100701', NULL,           0::smallint,  8300::numeric, 7.5::numeric,   760::numeric, NULL, 19, true,  NULL),
    ('Ashoka Heights',     'Ms. Priya Ranjan',   '+919811100702', NULL,           1::smallint,  8600::numeric, 7.5::numeric,  1480::numeric, 10,   12, true,  NULL),
    ('Ashoka Heights',     'Mr. Gaurav Malhotra','+919811100703', '778899001122', 2::smallint,  8900::numeric, 7.5::numeric,  2310::numeric, NULL, 27, true,  'Keeps a second parking slot.'),
    ('Ashoka Heights',     'Mrs. Neha Kulkarni', '+919811100704', NULL,           3::smallint,  9200::numeric, 7.5::numeric,   350::numeric, 1,     8, true,  'Agreement renewal due.'),
    ('Ashoka Heights',     'Mr. Alok Nandy',     '+919811100705', NULL,           4::smallint,  9600::numeric, 7.5::numeric,  1150::numeric, 6,     3, true,  'New tenant, first bill this month.')
  ) AS v(house, name, mobile, aadhaar, floor, rent, rate, opening, expiry_months, tenure_months, active, notes)
  JOIN houses h ON h.name = v.house
               AND h.owner_id = current_setting('app.seed_owner');

-- ---------------------------------------------------------------------------
-- Recurring charge presets, offered when creating a bill.
-- Meera Residency deliberately carries only Water charge + IGL (Gas) at 0, so
-- its bills total exactly what the mock receipt shows.
-- ---------------------------------------------------------------------------
INSERT INTO charge_presets (owner_id, house_id, label, amount)
SELECT current_setting('app.seed_owner'), h.id, v.label, v.amount
  FROM (VALUES
    ('Meera Residency',    'Water charge', 600::numeric),
    ('Meera Residency',    'IGL (Gas)',      0::numeric),
    ('Lotus Villa',        'Water charge', 500::numeric),
    ('Lotus Villa',        'Maintenance',  300::numeric),
    ('Sunrise Apartments', 'Water charge', 450::numeric),
    ('Sunrise Apartments', 'Maintenance',  200::numeric),
    ('Sunrise Apartments', 'Lift',         150::numeric),
    ('Green Nest',         'Water charge', 700::numeric),
    ('Green Nest',         'Maintenance',  400::numeric),
    ('Shanti Kunj',        'Water charge', 550::numeric),
    ('Shanti Kunj',        'Maintenance',  250::numeric),
    ('Ashoka Heights',     'Water charge', 650::numeric),
    ('Ashoka Heights',     'Maintenance',  350::numeric),
    ('Ashoka Heights',     'Lift',         200::numeric)
  ) AS v(house, label, amount)
  JOIN houses h ON h.name = v.house
               AND h.owner_id = current_setting('app.seed_owner');

-- ---------------------------------------------------------------------------
-- Bills. Every active tenant gets the current month; Meera Residency's four
-- also get the three previous months, so one house has history to page through.
--
-- Readings chain exactly: each month advances the meter by the tenant's fixed
-- monthly usage, so next_previous_reading() lines up with the last bill.
-- Rakesh is pinned to 129 units/month to match the mock receipt.
-- ---------------------------------------------------------------------------
INSERT INTO bills (owner_id, tenant_id, bill_month, rent_amount,
                   previous_reading, current_reading, electricity_rate)
SELECT current_setting('app.seed_owner'),
       t.id,
       (date_trunc('month', current_date) - (m.back || ' months')::interval)::date,
       t.monthly_rent,
       t.opening_meter_reading + (3 - m.back) * u.units,
       t.opening_meter_reading + (3 - m.back + 1) * u.units,
       t.electricity_rate
  FROM tenants t
  JOIN houses h ON h.id = t.house_id
  CROSS JOIN LATERAL (
    SELECT CASE WHEN t.name = 'Mr. Rakesh' THEN 129::numeric
                ELSE 95 + (abs(hashtext(t.name)) % 65)::numeric END AS units
  ) u
  CROSS JOIN (VALUES (3), (2), (1), (0)) AS m(back)
 WHERE t.owner_id = current_setting('app.seed_owner')
   AND t.is_active
   -- history only for the showcase house; everyone else gets the current month
   AND (h.name = 'Meera Residency' OR m.back = 0);

-- Recurring charges on every bill, from the house's presets. The
-- sync_bill_extra_charges trigger rolls these into bills.extra_charges_total,
-- which is why this has to happen before payments are settled.
INSERT INTO bill_charges (owner_id, bill_id, label, amount, sort_order)
SELECT current_setting('app.seed_owner'), b.id, cp.label, cp.amount,
       row_number() OVER (PARTITION BY b.id ORDER BY cp.label)::smallint
  FROM bills b
  JOIN tenants t ON t.id = b.tenant_id
  JOIN charge_presets cp ON cp.house_id = t.house_id
 WHERE b.owner_id = current_setting('app.seed_owner');

-- ---------------------------------------------------------------------------
-- Settle the bills oldest-first, so each month's previous_balance is genuinely
-- the prior month's shortfall and carry_forward_balance() agrees with the data.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  o        text := current_setting('app.seed_owner');
  this_mon date := date_trunc('month', current_date)::date;
  m        date;
BEGIN
  FOR m IN
    SELECT DISTINCT bill_month FROM bills WHERE owner_id = o ORDER BY bill_month
  LOOP
    -- carry the unpaid remainder of the previous month forward
    UPDATE bills b
       SET previous_balance = COALESCE((
             SELECT p.total_billed - p.amount_paid
               FROM bills p
              WHERE p.owner_id  = o
                AND p.tenant_id = b.tenant_id
                AND p.bill_month = (b.bill_month - interval '1 month')::date), 0)
     WHERE b.owner_id = o AND b.bill_month = m;

    -- then decide what was actually paid this month
    UPDATE bills b
       SET amount_paid = CASE
             WHEN b.bill_month < this_mon THEN
               CASE
                 -- part-paid three months ago, so a balance carries forward
                 WHEN t.name = 'Mr. Rakesh'
                      AND b.bill_month = (this_mon - interval '3 months')::date
                   THEN round(b.total_billed * 0.6, 2)
                 -- skipped a month entirely
                 WHEN t.name = 'Mrs. Sunita Devi'
                      AND b.bill_month = (this_mon - interval '2 months')::date
                   THEN 0
                 ELSE b.total_billed
               END
             ELSE
               CASE
                 WHEN t.name = 'Mr. Piyush' THEN b.total_billed          -- mock: pending 0
                 WHEN t.name = 'Mr. Rakesh' THEN 0                       -- mock: pending
                 WHEN abs(hashtext(t.name)) % 3 = 0 THEN b.total_billed  -- paid
                 WHEN abs(hashtext(t.name)) % 3 = 1
                   THEN round(b.total_billed * 0.5, 2)                   -- part-paid
                 ELSE 0                                                 -- unpaid
               END
           END
      FROM tenants t
     WHERE t.id = b.tenant_id AND b.owner_id = o AND b.bill_month = m;
  END LOOP;
END $$;

-- Payment metadata for anything that saw money. Left NULL on unpaid bills,
-- which is what the UI keys "pending" off.
UPDATE bills
   SET paid_on        = LEAST((bill_month + interval '4 days')::date, current_date),
       payment_method = (ARRAY['upi', 'gpay', 'cash', 'bank'])[1 + (abs(hashtext(id::text)) % 4)]
 WHERE owner_id = current_setting('app.seed_owner')
   AND amount_paid > 0;

-- Sunita hands over cash, so the hashed method above is wrong for her.
UPDATE bills b
   SET payment_method = 'cash'
  FROM tenants t
 WHERE t.id = b.tenant_id
   AND b.owner_id = current_setting('app.seed_owner')
   AND t.name = 'Mrs. Sunita Devi'
   AND b.amount_paid > 0;
