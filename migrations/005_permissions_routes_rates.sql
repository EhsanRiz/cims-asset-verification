-- 005_permissions_routes_rates.sql
--
-- Client-requested permission changes (2026-08):
--   1. assistant_clo becomes an editor (can upload photos/documents/CAFs and
--      edit field values — edits still go through the approval workflow since
--      assistant_clo is not an approver).
--   2. Routes: any editor can propose a new route; RCO (or admin) approves.
--      The routes table itself carries the trail (created_by / reviewed_by).
--   3. Valuation rates: writable by any editor (was admin-only at the RLS
--      layer), with a full audit trail in rates_audit_log via triggers.
--   4. total_compensation now includes Other Affected Assets, and the
--      rate-propagation RPCs recompute it accordingly.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. assistant_clo → editor
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.current_user_role() = ANY(ARRAY['admin','user','clo','arco','rco','essm','assistant_clo'])
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Routes: proposal + RCO approval workflow
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_route_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.current_user_role() = ANY(ARRAY['admin','rco'])
$$;

ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS created_by       uuid,
  ADD COLUMN IF NOT EXISTS created_by_name  text,
  ADD COLUMN IF NOT EXISTS reviewed_by      uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by_name text,
  ADD COLUMN IF NOT EXISTS reviewed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS review_note      text;

DO $$ BEGIN
  ALTER TABLE public.routes
    ADD CONSTRAINT routes_status_check CHECK (status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Prevent duplicate route names (case/whitespace-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS routes_name_unique
  ON public.routes (lower(btrim(route_name)));

-- Editors may propose routes; only RCO/admin may insert pre-approved ones.
DROP POLICY IF EXISTS routes_insert_editor ON public.routes;
CREATE POLICY routes_insert_editor ON public.routes
  FOR INSERT
  WITH CHECK (public.is_editor() AND (status = 'pending' OR public.is_route_approver()));

-- RCO/admin review (approve/reject) pending routes.
DROP POLICY IF EXISTS routes_review_update ON public.routes;
CREATE POLICY routes_review_update ON public.routes
  FOR UPDATE
  USING (public.is_route_approver())
  WITH CHECK (public.is_route_approver());

-- (routes_admin_write ALL/is_admin and routes_select remain unchanged.)

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Valuation rates: editor writes + audit trail
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS vlr_admin_write ON public.valuation_land_rates;
DROP POLICY IF EXISTS vlr_editor_write ON public.valuation_land_rates;
CREATE POLICY vlr_editor_write ON public.valuation_land_rates
  FOR ALL USING (public.is_editor()) WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS var_admin_write ON public.valuation_asset_rates;
DROP POLICY IF EXISTS var_editor_write ON public.valuation_asset_rates;
CREATE POLICY var_editor_write ON public.valuation_asset_rates
  FOR ALL USING (public.is_editor()) WITH CHECK (public.is_editor());

CREATE TABLE IF NOT EXISTS public.rates_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_table      text NOT NULL,           -- 'valuation_land_rates' | 'valuation_asset_rates'
  rate_id         uuid,
  rate_label      text,                    -- e.g. 'Rural / Agric' or 'Fruit Tree'
  action          text NOT NULL,           -- INSERT | UPDATE | DELETE
  old_values      jsonb,
  new_values      jsonb,
  changed_by      uuid,                    -- auth.users id
  changed_by_name text,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rates_audit_log_changed_at_idx
  ON public.rates_audit_log (changed_at DESC);

ALTER TABLE public.rates_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rates_audit_select ON public.rates_audit_log;
CREATE POLICY rates_audit_select ON public.rates_audit_log
  FOR SELECT USING (public.is_authenticated_cims_user());
-- No INSERT/UPDATE/DELETE policies: rows are written only by the
-- SECURITY DEFINER trigger below, which bypasses RLS.

CREATE OR REPLACE FUNCTION public.log_rate_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name text;
  label text;
  oldv jsonb;
  newv jsonb;
BEGIN
  SELECT full_name INTO actor_name
    FROM public.system_users
   WHERE auth_user_id = auth.uid() AND is_active = true
   LIMIT 1;

  IF TG_TABLE_NAME = 'valuation_land_rates' THEN
    label := COALESCE(NEW.route_type, OLD.route_type) || ' / ' || COALESCE(NEW.land_use, OLD.land_use);
    IF TG_OP <> 'INSERT' THEN oldv := jsonb_build_object('rate_perm', OLD.rate_perm, 'rate_temp', OLD.rate_temp); END IF;
    IF TG_OP <> 'DELETE' THEN newv := jsonb_build_object('rate_perm', NEW.rate_perm, 'rate_temp', NEW.rate_temp); END IF;
  ELSE
    label := COALESCE(NEW.asset_type, OLD.asset_type);
    IF TG_OP <> 'INSERT' THEN oldv := jsonb_build_object('rate', OLD.rate, 'unit', OLD.unit, 'category', OLD.category); END IF;
    IF TG_OP <> 'DELETE' THEN newv := jsonb_build_object('rate', NEW.rate, 'unit', NEW.unit, 'category', NEW.category); END IF;
  END IF;

  -- Only record UPDATEs that actually changed the audited fields
  -- (updated_at/updated_by churn alone is not a rate change).
  IF TG_OP = 'UPDATE' AND oldv = newv THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.rates_audit_log
    (rate_table, rate_id, rate_label, action, old_values, new_values, changed_by, changed_by_name)
  VALUES
    (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), label, TG_OP, oldv, newv, auth.uid(), COALESCE(actor_name, 'Unknown'));

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_land_rates_audit ON public.valuation_land_rates;
CREATE TRIGGER trg_land_rates_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.valuation_land_rates
  FOR EACH ROW EXECUTE FUNCTION public.log_rate_change();

DROP TRIGGER IF EXISTS trg_asset_rates_audit ON public.valuation_asset_rates;
CREATE TRIGGER trg_asset_rates_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.valuation_asset_rates
  FOR EACH ROW EXECUTE FUNCTION public.log_rate_change();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Compensation helpers + rate-propagation RPCs
--    total_compensation = land part + other-assets part + disturbance
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.other_assets_value(assets jsonb)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE(SUM(
    COALESCE(NULLIF(e->>'quantity','')::numeric, 0) * COALESCE(NULLIF(e->>'rate','')::numeric, 0)
  ), 0)
  FROM jsonb_array_elements(COALESCE(assets, '[]'::jsonb)) e
$$;

CREATE OR REPLACE FUNCTION public.land_assets_value(assets jsonb)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE(SUM(
      COALESCE(NULLIF(e->>'affected_area_perm','')::numeric, 0) * COALESCE(NULLIF(e->>'rate_perm','')::numeric, 0)
    + COALESCE(NULLIF(e->>'affected_area_temp','')::numeric, 0) * COALESCE(NULLIF(e->>'rate_temp','')::numeric, 0)
  ), 0)
  FROM jsonb_array_elements(COALESCE(assets, '[]'::jsonb)) e
$$;

CREATE OR REPLACE FUNCTION public.apply_land_rate_change(
  land_use_in text, route_type_in text, new_rate_perm numeric, new_rate_temp numeric
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_legacy integer;
  affected_multi integer;
BEGIN
  IF NOT public.is_editor() THEN
    RAISE EXCEPTION 'Editor role required to change valuation rates';
  END IF;

  UPDATE public.households
  SET rate_perm = new_rate_perm,
      rate_temp = new_rate_temp,
      total_compensation = COALESCE(affected_area_perm, 0) * COALESCE(new_rate_perm, 0)
                         + COALESCE(affected_area_temp, 0) * COALESCE(new_rate_temp, 0)
                         + COALESCE(disturbance_allowance, 0)
                         + public.other_assets_value(other_assets_json),
      updated_at = now()
  WHERE land_use = land_use_in
    AND route_type = route_type_in
    AND (land_assets_json IS NULL OR jsonb_array_length(land_assets_json) = 0);
  GET DIAGNOSTICS affected_legacy = ROW_COUNT;

  WITH rebuilt AS (
    SELECT h.id,
      (
        SELECT jsonb_agg(
          CASE WHEN elem->>'land_use' = land_use_in
            THEN jsonb_set(jsonb_set(elem, '{rate_perm}', to_jsonb(new_rate_perm)), '{rate_temp}', to_jsonb(new_rate_temp))
            ELSE elem
          END
        )
        FROM jsonb_array_elements(h.land_assets_json) elem
      ) AS new_assets
    FROM public.households h
    WHERE h.route_type = route_type_in
      AND h.land_assets_json IS NOT NULL
      AND jsonb_array_length(h.land_assets_json) > 0
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(h.land_assets_json) e WHERE e->>'land_use' = land_use_in)
  )
  UPDATE public.households h
  SET land_assets_json = r.new_assets,
      total_compensation = public.land_assets_value(r.new_assets)
                         + COALESCE(h.disturbance_allowance, 0)
                         + public.other_assets_value(h.other_assets_json),
      updated_at = now()
  FROM rebuilt r
  WHERE h.id = r.id;
  GET DIAGNOSTICS affected_multi = ROW_COUNT;

  RETURN affected_legacy + affected_multi;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_asset_rate_change(asset_type_in text, new_rate numeric)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected integer;
BEGIN
  IF NOT public.is_editor() THEN
    RAISE EXCEPTION 'Editor role required to change valuation rates';
  END IF;

  WITH rebuilt AS (
    SELECT h.id,
      (
        SELECT jsonb_agg(
          CASE WHEN lower(elem->>'type') = lower(asset_type_in)
            THEN jsonb_set(
                   jsonb_set(elem, '{rate}', to_jsonb(new_rate)),
                   '{value}', to_jsonb(COALESCE(NULLIF(elem->>'quantity','')::numeric, 0) * COALESCE(new_rate, 0))
                 )
            ELSE elem
          END
        )
        FROM jsonb_array_elements(h.other_assets_json) elem
      ) AS new_assets
    FROM public.households h
    WHERE h.other_assets_json IS NOT NULL
      AND jsonb_array_length(h.other_assets_json) > 0
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(h.other_assets_json) e WHERE lower(e->>'type') = lower(asset_type_in))
  )
  UPDATE public.households h
  SET other_assets_json = r.new_assets,
      total_compensation = CASE
          WHEN h.land_assets_json IS NOT NULL AND jsonb_array_length(h.land_assets_json) > 0
            THEN public.land_assets_value(h.land_assets_json)
          ELSE COALESCE(h.affected_area_perm, 0) * COALESCE(h.rate_perm, 0)
             + COALESCE(h.affected_area_temp, 0) * COALESCE(h.rate_temp, 0)
        END
        + COALESCE(h.disturbance_allowance, 0)
        + public.other_assets_value(r.new_assets),
      updated_at = now()
  FROM rebuilt r
  WHERE h.id = r.id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
