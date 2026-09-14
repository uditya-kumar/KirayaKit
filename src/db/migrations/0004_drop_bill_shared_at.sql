-- ---------------------------------------------------------------------------
-- 0004 — bills.shared_at is dropped
-- ---------------------------------------------------------------------------
--
-- The column was meant to record that a receipt had gone out, but nothing ever
-- set it, and nothing honestly could: sharing hands the text to WhatsApp through
-- a wa.me link and the app never hears back, so "shared at 18:04" would be a
-- claim about the outside world that the client cannot make. A column that is
-- always NULL is worse than no column — it invites a screen to trust it.
--
-- Two objects have to move out of the way first, and both come back unchanged
-- below:
--
--   * v_bill_receipt selects the column, and CREATE OR REPLACE VIEW cannot drop a
--     column from a view's output list.
--   * save_bill's ON CONFLICT ... SET ... excluded.* reads bills as a whole row,
--     which Postgres records as a dependency on every column of it — including
--     one the body never names. CREATE OR REPLACE would only re-record it, so the
--     function is dropped and recreated around the ALTER.
--
-- Dropping either takes its grants with it, hence the GRANT/REVOKE at the end.

DROP VIEW v_bill_receipt;
DROP FUNCTION save_bill(uuid, date, numeric, numeric, jsonb);

ALTER TABLE bills DROP COLUMN shared_at;

-- Bill Details receipt and Payment History rows. 0001's definition, minus the
-- one column.
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
       b.paid_on, b.payment_method
  FROM bills b
  JOIN tenants t ON t.id = b.tenant_id
  JOIN houses  h ON h.id = t.house_id;

-- Raise or correct one month's bill, charge rows and all — 0003's function, body
-- for body, with the reasoning behind each statement recorded there.
CREATE FUNCTION save_bill(
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

  SELECT b.id FROM bills b
   WHERE b.tenant_id = p_tenant AND b.bill_month = p_month;
END;

GRANT SELECT ON v_bill_receipt TO authenticated;
REVOKE EXECUTE ON FUNCTION save_bill(uuid, date, numeric, numeric, jsonb)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_bill(uuid, date, numeric, numeric, jsonb)
  TO authenticated;
