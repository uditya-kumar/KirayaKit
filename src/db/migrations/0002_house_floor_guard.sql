-- ---------------------------------------------------------------------------
-- 0002 — a house cannot shrink out from under its tenants
-- ---------------------------------------------------------------------------
--
-- The House form can lower number_of_floors on an existing house. The guard from
-- 0001 (tenants_floor_range) only fires on tenants, so that update went through
-- unchecked and could leave an active tenant standing on a floor the house no
-- longer had — a row the app can no longer explain, and one that a re-save of the
-- tenant would then refuse.

-- Only active, non-deleted tenants count, matching tenants_active_floor_key and
-- the tenant_count in v_house_list: someone who has moved out is history and must
-- not keep a floor reserved forever.
CREATE FUNCTION check_house_floor_range() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  highest smallint;
BEGIN
  SELECT max(floor_number) INTO highest
    FROM tenants
   WHERE house_id = NEW.id
     AND is_active
     AND deleted_at IS NULL;

  -- Phrased as the minimum rather than "cannot have % floors" so the sentence
  -- never reads "1 floors": the CHECK already forbids 0, so this only fires when
  -- the highest occupied floor is 1 or more.
  IF highest IS NOT NULL AND highest >= NEW.number_of_floors THEN
    RAISE EXCEPTION
      -- Capitalised, unlike Postgres's own lowercase style: this message is not
      -- for a log, it lands verbatim under the House form's Save button.
      'A tenant still lives on floor %, so this house needs at least % floors',
      highest, highest + 1
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- WHEN keeps it to the shrinking case; growing a house can strand nobody, and
-- every other UPDATE on houses (a rename, the soft delete) skips the query.
CREATE TRIGGER houses_floor_range
BEFORE UPDATE OF number_of_floors ON houses
FOR EACH ROW WHEN (NEW.number_of_floors < OLD.number_of_floors)
EXECUTE FUNCTION check_house_floor_range();
