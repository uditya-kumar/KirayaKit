-- ---------------------------------------------------------------------------
-- 0003 — the Bill form: one read for the draft, one write for the bill
-- ---------------------------------------------------------------------------
--
-- Design node H68UY. For one (tenant, month) the screen needs the rent and rate
-- to snapshot, the reading the meter is counting up from, the unpaid amount
-- carried in, and — when that month has been billed already — the bill itself
-- with its extra charges. Saving writes the bill and replaces its charge rows,
-- which is several statements, so both sides live here rather than in the client
-- (CLAUDE.md: multi-step writes go in a SQL function called via .rpc()).
--
-- Both are SECURITY INVOKER, the default: the owner policies on tenants, bills
-- and bill_charges still apply, so a caller can only draft or bill their own
-- tenant and somebody else's id simply matches no rows.
--
-- Both use a SQL-standard body (BEGIN ATOMIC) rather than plpgsql, for the reason
-- spelled out above ensure_profile() in 0001: bills.owner_id and
-- bill_charges.owner_id default to auth.user_id(), and only a body parsed at
-- definition time — while this migration runs as the table owner — resolves that
-- name. A plpgsql body resolves it per call as `authenticated`, which holds
-- EXECUTE on auth.user_id() but no USAGE on the schema that contains it.

-- The old body summed every earlier month's balance, which charges a carried
-- debt again for each bill it appears in: February's unpaid ₹6,000 is already
-- inside March's previous_balance, so a bill for April that added both would ask
-- for those rupees twice. An unpaid month is always carried into the next bill,
-- which makes the newest earlier bill's unpaid part the whole debt — one row.
--
-- The same flaw is still in v_tenant_list.total_pending; see the TODO in
-- api/tenants.ts.
CREATE OR REPLACE FUNCTION carry_forward_balance(p_tenant uuid, p_month date)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT b.total_billed - b.amount_paid
      FROM bills b
     WHERE b.tenant_id = p_tenant AND b.bill_month < p_month
     ORDER BY b.bill_month DESC
     LIMIT 1), 0);
$$;

-- Everything the form seeds its fields from, in one row. An already-billed month
-- comes back as the bill it is; a fresh one comes back as the bill it would be,
-- so the screen draws the same way either way and never has to do this maths
-- itself.
CREATE FUNCTION bill_draft(p_tenant uuid, p_month date)
RETURNS TABLE (
  bill_id            uuid,
  rent_amount        numeric,
  electricity_rate   numeric,
  previous_reading   numeric,
  previous_balance   numeric,
  current_reading    numeric,
  amount_paid        numeric,
  charges            jsonb
)
LANGUAGE sql STABLE
BEGIN ATOMIC
  SELECT b.id,
         -- A raised bill keeps the rent and rate it was raised with, which is the
         -- point of snapshotting them; only a new one takes today's figures.
         COALESCE(b.rent_amount, t.monthly_rent),
         COALESCE(b.electricity_rate, t.electricity_rate),
         COALESCE(b.previous_reading, next_previous_reading(p_tenant, p_month)),
         COALESCE(b.previous_balance, carry_forward_balance(p_tenant, p_month)),
         -- As far as a bill that does not exist yet knows the meter has not moved,
         -- so the current reading starts level with the previous one: zero units,
         -- and bills_reading_forward holds until someone types the real figure.
         COALESCE(b.current_reading, next_previous_reading(p_tenant, p_month)),
         COALESCE(b.amount_paid, 0),
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object('label', c.label, 'amount', c.amount)
                            ORDER BY c.sort_order)
             FROM bill_charges c WHERE c.bill_id = b.id), '[]'::jsonb)
    FROM tenants t
    LEFT JOIN bills b ON b.tenant_id = t.id AND b.bill_month = p_month
   WHERE t.id = p_tenant AND t.deleted_at IS NULL;
END;

-- Raise or correct one month's bill, charge rows and all.
--
-- The month is the bill's identity (bills_tenant_month_key), so this upserts on
-- it: saving a month that has never been billed creates it, saving one that has
-- corrects it. previous_reading and previous_balance are recomputed rather than
-- accepted from the client — they are derived from the months before, and a form
-- that has been sitting open must not be able to write a stale carry-forward.
-- rent_amount and electricity_rate are deliberately absent from the UPDATE: an
-- existing bill keeps its snapshot even after the tenant's rent changes.
--
-- Charges are replaced wholesale instead of diffed: a bill carries a handful of
-- rows, the trigger on bill_charges re-totals extra_charges_total either way, and
-- the client has no ids to diff against.
--
-- paid_on and payment_method are left untouched: node H68UY does not ask for
-- them, and stamping today's date on a payment nobody described would put a wrong
-- date on a shared receipt.
CREATE FUNCTION save_bill(
  p_tenant          uuid,
  p_month           date,
  p_current_reading numeric,
  p_amount_paid     numeric,
  p_charges         jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE sql
BEGIN ATOMIC
  -- Driven off a SELECT on tenants so RLS decides whether there is anything to
  -- insert at all: an id that is not this owner's yields no row, and the
  -- statements below then find no bill to touch.
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

  -- Position in the array is the order the form drew them in, which is what
  -- sort_order records; a row whose label was left blank is dropped rather than
  -- rejected, so an empty "Add charge" row costs nothing.
  INSERT INTO bill_charges (bill_id, label, amount, sort_order)
  SELECT (SELECT b.id FROM bills b
           WHERE b.tenant_id = p_tenant AND b.bill_month = p_month),
         btrim(c.value ->> 'label'),
         COALESCE((c.value ->> 'amount')::numeric, 0),
         (c.ord - 1)::smallint
    FROM jsonb_array_elements(p_charges) WITH ORDINALITY AS c(value, ord)
   WHERE length(btrim(COALESCE(c.value ->> 'label', ''))) > 0;

  SELECT b.id FROM bills b
   WHERE b.tenant_id = p_tenant AND b.bill_month = p_month;
END;

-- PUBLIC gets EXECUTE on a new function by default, and neither of these has any
-- business being reachable by the anonymous role — RLS is what decides which
-- rows, but the door itself may as well be shut.
REVOKE EXECUTE ON FUNCTION bill_draft(uuid, date),
                           save_bill(uuid, date, numeric, numeric, jsonb)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bill_draft(uuid, date),
                          save_bill(uuid, date, numeric, numeric, jsonb)
  TO authenticated;
