-- ---------------------------------------------------------------------------
-- 0005 — what a tenant owes, and what a deleted house takes with it
-- ---------------------------------------------------------------------------
--
-- Five things, all of them about the same number being wrong in different
-- places:
--
--   1. v_tenant_list.total_pending summed every month, so a carried debt was
--      counted once per bill it appeared in. 0003 already fixed the same flaw in
--      carry_forward_balance; this is the copy of it that the tenant cards read.
--   2. The three views joined houses and tenants without honouring deleted_at, so
--      a soft-deleted house's tenants and bills kept turning up in totals.
--   3. Soft-deleting a house left its tenants live, which is what made (2) show.
--   4. save_bill only ever recomputed the month it was saving, so correcting an
--      older bill left every later month carrying a balance and a meter reading
--      from before the correction.
--   5. The Profile screen had to download every bill in the account to add up one
--      figure, because no view carried a portfolio total. v_owner_summary does.
--
-- Also drops five indexes nothing can use — see the end of the file.
--
-- Apply with the runner, which wraps the file in one transaction and reloads the
-- Data API's schema cache afterwards — v_owner_summary 404s until it does:
--   npm run migrate src/db/migrations/0005_pending_and_summary.sql

-- ---------------------------------------------------------------------------
-- A tenant's debt is one row, not a sum
-- ---------------------------------------------------------------------------
--
-- An unpaid month is carried into the next bill's previous_balance and billed
-- again, which makes the newest bill's unpaid part the whole debt: February's
-- ₹6,000 is already inside March's total, so adding both asked for those rupees
-- twice. The seeded Mr. Rakesh read ₹8,923.60 against a real ₹6,374, and Mrs.
-- Sunita Devi read ₹6,820 owing nothing at all.
--
-- Clamped at 0 because an overpayment is a credit against that tenant's next
-- bill, not a negative amount to display on a card labelled "pending" — the
-- credit itself still travels, as a negative previous_balance on the next bill.
--
-- Dropped and recreated rather than CREATE OR REPLACE: the LATERAL's output types
-- change from sum(numeric) to a plain column, and REPLACE cannot alter a view
-- column's type. The GRANT goes with the dropped view, hence the re-grant.
DROP VIEW v_tenant_list;

CREATE VIEW v_tenant_list WITH (security_invoker = true) AS
SELECT t.id, t.owner_id, t.house_id, h.name AS house_name,
       t.name, t.floor_number, t.mobile_number,
       t.monthly_rent, t.electricity_rate, t.agreement_expiry, t.is_active,
       COALESCE(GREATEST(b.total_billed - b.amount_paid, 0), 0) AS total_pending,
       b.bill_month AS last_bill_month
  FROM tenants t
  JOIN houses h ON h.id = t.house_id AND h.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT bl.bill_month, bl.total_billed, bl.amount_paid
      FROM bills bl
     WHERE bl.tenant_id = t.id
     ORDER BY bl.bill_month DESC
     LIMIT 1
  ) b ON true
 WHERE t.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Deleted houses and tenants leave the receipt views too
-- ---------------------------------------------------------------------------
--
-- Both of these joined straight through to houses, so a bill belonging to a
-- deleted house stayed readable and stayed in every total built from the view.
-- Nothing in the app can reach such a bill on purpose — there is no route to a
-- deleted house — so a row that only ever arrived through a portfolio-wide query
-- was, in practice, only ever wrong.
CREATE OR REPLACE VIEW v_bill_receipt WITH (security_invoker = true) AS
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
       b.paid_on, b.payment_method
  FROM bills b
  JOIN tenants t ON t.id = b.tenant_id AND t.deleted_at IS NULL
  JOIN houses  h ON h.id = t.house_id  AND h.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_house_month_summary WITH (security_invoker = true) AS
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
  JOIN tenants t ON t.id = b.tenant_id AND t.deleted_at IS NULL
  JOIN houses  h ON h.id = t.house_id  AND h.deleted_at IS NULL
 GROUP BY h.id, h.owner_id, b.bill_month;

-- ---------------------------------------------------------------------------
-- Deleting a house takes its tenants with it
-- ---------------------------------------------------------------------------
--
-- The client's delete is one UPDATE that stamps houses.deleted_at, and the
-- tenants were left live: the house vanished from v_house_list while its people
-- stayed in v_tenant_list, so the Profile screen counted one fewer property and
-- the same debts. Done here rather than in the client because the two updates
-- have to be one act — a client that manages the first and loses the network on
-- the second would leave exactly the state this is fixing.
--
-- plpgsql is safe in this one: the body never names auth.user_id() (see the note
-- above ensure_profile in 0001), and the owner policy on tenants — a stored
-- expression — still decides which rows it may touch.
CREATE FUNCTION cascade_house_soft_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Same timestamp as the house, so "deleted with the house" is legible in the
  -- data rather than inferred from two clocks.
  UPDATE tenants
     SET deleted_at = NEW.deleted_at
   WHERE house_id = NEW.id
     AND deleted_at IS NULL;
  RETURN NULL;
END;
$$;

-- Only the moment of deletion. A rename or a floor change never fires it, and an
-- undelete deliberately does not bring the tenants back: there is no undelete in
-- the app, and guessing which of them were live at the time is not the trigger's
-- business.
CREATE TRIGGER houses_soft_delete_cascade
AFTER UPDATE OF deleted_at ON houses
FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION cascade_house_soft_delete();

-- Houses deleted before this trigger existed left their tenants behind; catch
-- them up so the views and the trigger agree about history.
UPDATE tenants t
   SET deleted_at = h.deleted_at
  FROM houses h
 WHERE h.id = t.house_id
   AND h.deleted_at IS NOT NULL
   AND t.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Correcting an old bill corrects the months after it
-- ---------------------------------------------------------------------------
--
-- previous_reading and previous_balance are derived from the month before, so a
-- correction to June is a correction to July, August and everything after —
-- 0004's version recomputed only the month it was handed, and left the rest
-- carrying figures from before the edit. Nothing in the app showed them as
-- stale, because a bill's own arithmetic stayed internally consistent.
--
-- The chain has to be walked in order: total_billed is generated from
-- previous_balance, so July's carry cannot be known until July's total is, which
-- cannot be known until June's is. A recursive CTE walks it in one statement,
-- repeating the generated column's expression — change the arithmetic in
-- bills.total_billed and this has to change with it.
--
-- It runs last, after the charge rows are in: bill_charges' trigger is what puts
-- extra_charges_total on the saved month, and that feeds the total this walks
-- forward from.
--
-- If the correction pushes a meter reading above a later month's,
-- bills_reading_forward rejects the UPDATE and the whole RPC rolls back — which
-- is the honest outcome: June's meter cannot read higher than July's.
CREATE OR REPLACE FUNCTION save_bill(
  p_tenant          uuid,
  p_month           date,
  p_current_reading numeric,
  p_amount_paid     numeric,
  p_charges         jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE sql
BEGIN ATOMIC
  INSERT INTO bills (tenant_id, bill_month, rent_amount, electricity_rate,
                     previous_reading, current_reading,
                     previous_balance, amount_paid)
  SELECT t.id, p_month, t.monthly_rent, t.electricity_rate,
         next_previous_reading(t.id, p_month), p_current_reading,
         carry_forward_balance(t.id, p_month), p_amount_paid
    FROM tenants t
   WHERE t.id = p_tenant AND t.deleted_at IS NULL
  ON CONFLICT (tenant_id, bill_month) DO UPDATE
     SET current_reading  = excluded.current_reading,
         previous_reading = excluded.previous_reading,
         previous_balance = excluded.previous_balance,
         amount_paid      = excluded.amount_paid;

  DELETE FROM bill_charges
   WHERE bill_id = (SELECT b.id FROM bills b
                     WHERE b.tenant_id = p_tenant AND b.bill_month = p_month);

  INSERT INTO bill_charges (bill_id, label, amount, sort_order)
  SELECT (SELECT b.id FROM bills b
           WHERE b.tenant_id = p_tenant AND b.bill_month = p_month),
         btrim(c.value ->> 'label'),
         COALESCE((c.value ->> 'amount')::numeric, 0),
         (c.ord - 1)::smallint
    FROM jsonb_array_elements(p_charges) WITH ORDINALITY AS c(value, ord)
   WHERE length(btrim(COALESCE(c.value ->> 'label', ''))) > 0;

  -- seq numbers the months after the saved one so the walk can step from each to
  -- the next by a plain join; a LATERAL "the next month after this one" would put
  -- the recursive reference inside a subquery, which Postgres forbids.
  WITH RECURSIVE later AS (
    SELECT b.id, b.bill_month, b.rent_amount, b.electricity_rate,
           b.extra_charges_total, b.current_reading, b.amount_paid,
           row_number() OVER (ORDER BY b.bill_month) AS seq
      FROM bills b
     WHERE b.tenant_id = p_tenant AND b.bill_month > p_month
  ), chain AS (
    -- The saved month itself, which is already right. It contributes no update,
    -- only the reading and the unpaid amount the next month starts from.
    SELECT 0::bigint       AS seq,
           NULL::uuid      AS id,
           NULL::numeric   AS previous_reading,
           NULL::numeric   AS previous_balance,
           b.current_reading               AS reading_out,
           b.total_billed - b.amount_paid  AS carry_out
      FROM bills b
     WHERE b.tenant_id = p_tenant AND b.bill_month = p_month
    UNION ALL
    SELECT l.seq, l.id,
           c.reading_out, c.carry_out,
           l.current_reading,
           round(l.rent_amount
                 + (l.current_reading - c.reading_out) * l.electricity_rate
                 + l.extra_charges_total
                 + c.carry_out, 2) - l.amount_paid
      FROM chain c
      JOIN later l ON l.seq = c.seq + 1
  )
  UPDATE bills b
     SET previous_reading = c.previous_reading,
         previous_balance = c.previous_balance
    FROM chain c
   WHERE b.id = c.id
     AND (b.previous_reading, b.previous_balance)
      IS DISTINCT FROM (c.previous_reading, c.previous_balance);

  SELECT b.id FROM bills b
   WHERE b.tenant_id = p_tenant AND b.bill_month = p_month;
END;

-- ---------------------------------------------------------------------------
-- The Profile screen's three numbers, in one row
-- ---------------------------------------------------------------------------
--
-- fetchOwnerSummary used to pull every bill in the account and reduce it in the
-- client — unbounded, and quietly wrong the moment the Data API's row cap cut the
-- list off. The maths belongs where the rest of it lives.
--
-- One row per users row, and RLS on users means the caller sees only their own,
-- so PostgREST can read it without a filter. The counts are correlated
-- subqueries rather than joins so three different groupings do not have to be
-- reconciled into one GROUP BY.
--
-- `pending` counts tenants who have moved out as well as active ones: a debt does
-- not stop existing because the tenant did. It matches v_tenant_list.total_pending
-- tenant for tenant, so the cards and the tile can never disagree.
CREATE VIEW v_owner_summary WITH (security_invoker = true) AS
SELECT u.id AS owner_id,
       (SELECT count(*)
          FROM houses h
         WHERE h.owner_id = u.id
           AND h.deleted_at IS NULL) AS properties,
       -- Active tenants of live houses — the same rule v_house_list counts by, so
       -- this tile always equals the sum of the cards.
       (SELECT count(*)
          FROM tenants t
          JOIN houses h ON h.id = t.house_id AND h.deleted_at IS NULL
         WHERE t.owner_id = u.id
           AND t.is_active
           AND t.deleted_at IS NULL) AS tenants,
       (SELECT COALESCE(sum(GREATEST(b.total_billed - b.amount_paid, 0)), 0)
          FROM tenants t
          JOIN houses h ON h.id = t.house_id AND h.deleted_at IS NULL
          JOIN LATERAL (
            SELECT bl.total_billed, bl.amount_paid
              FROM bills bl
             WHERE bl.tenant_id = t.id
             ORDER BY bl.bill_month DESC
             LIMIT 1
          ) b ON true
         WHERE t.owner_id = u.id
           AND t.deleted_at IS NULL) AS pending
  FROM users u;

-- ---------------------------------------------------------------------------
-- A floor that does not exist, said in a sentence
-- ---------------------------------------------------------------------------
--
-- The form now checks the floor against the house before saving, so this is the
-- fallback for a house that shrank in another session. 0001's wording read like a
-- log line; it lands under a Save button, so it reads like 0002's does.
CREATE OR REPLACE FUNCTION check_tenant_floor() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  floors smallint;
BEGIN
  SELECT number_of_floors INTO floors FROM houses WHERE id = NEW.house_id;
  IF NEW.floor_number >= floors THEN
    RAISE EXCEPTION
      -- Phrased as the highest floor rather than the count, so it never has to
      -- say "1 floors", and it names the convention the number follows.
      'The highest floor in this house is %, counting the ground floor as 0',
      floors - 1
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Indexes nothing can use
-- ---------------------------------------------------------------------------
--
-- Every one of these was verified against pg_stat_user_indexes on the live branch
-- before being dropped: idx_scan = 0 on all five, while houses_owner_name_key and
-- tenants_owner_house_idx carry ~11k scans each. A GIN index is not free — it is
-- maintained on every insert and update of the column it covers.
--
--   * The two trigram indexes were for a name search that both list screens do in
--     the client instead: a landlord has a handful of houses and a house a handful
--     of tenants, and matching as you type beats a round trip per keystroke.
--     0001 said as much next to the index. pg_trgm itself is left installed —
--     nothing costs anything for that, and a server-side search would want it
--     back.
--   * tenants_expiry_idx was for agreement-expiry reminders, which do not exist.
--   * bills_unsettled_idx was for a "tenants who owe" query; what the app actually
--     reads is one tenant's newest bill, which bills_owner_tenant_month_idx
--     already answers.
--   * houses_owner_idx is a strict prefix of houses_owner_name_key — same leading
--     column, same WHERE deleted_at IS NULL — so the planner never had a reason to
--     pick it.
DROP INDEX houses_name_trgm_idx;
DROP INDEX tenants_name_trgm_idx;
DROP INDEX tenants_expiry_idx;
DROP INDEX bills_unsettled_idx;
DROP INDEX houses_owner_idx;

-- v_tenant_list was dropped and took its grant with it; v_owner_summary is new.
-- The other two were replaced in place, which keeps theirs.
GRANT SELECT ON v_tenant_list, v_owner_summary TO authenticated;
