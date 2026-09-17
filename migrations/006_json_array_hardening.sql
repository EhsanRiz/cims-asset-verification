-- 006_json_array_hardening.sql
--
-- Fix for a defect exposed by 005: 47 households store `other_assets_json`
-- as a JSON *string* containing a JSON array (double-encoded, from an older
-- import path) rather than a jsonb array. The frontend tolerates this
-- (OtherAssets does `typeof assets === 'string' ? JSON.parse(assets) : ...`),
-- but the SQL helpers added in 005 call jsonb_array_elements() directly and
-- throw `cannot extract elements from a scalar` on those rows.
--
-- Effect before this fix: saving a Rural/Res land rate (or any asset rate
-- touching an affected PAP) in the Rates Master aborts the whole propagate
-- with a scalar error, so the rate change never applies.
--
-- Fix: normalise through as_json_array() everywhere a jsonb array is assumed.
-- Rows the propagate RPCs rewrite are also normalised to real arrays on the
-- way through; rows nobody touches keep working because every read path now
-- goes through the normaliser.

CREATE OR REPLACE FUNCTION public.as_json_array(v jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  parsed jsonb;
BEGIN
  IF v IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  CASE jsonb_typeof(v)
    WHEN 'array' THEN
      RETURN v;
    WHEN 'string' THEN
      -- Double-encoded array: the jsonb value is a string whose text is JSON.
      BEGIN
        parsed := (v #>> '{}')::jsonb;
      EXCEPTION WHEN others THEN
        RETURN '[]'::jsonb;
      END;
      IF jsonb_typeof(parsed) = 'array' THEN
        RETURN parsed;
      END IF;
      RETURN '[]'::jsonb;
    ELSE
      -- number / boolean / json null — nothing iterable.
      RETURN '[]'::jsonb;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.other_assets_value(assets jsonb)
RETURNS numeric
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(
    COALESCE(NULLIF(e->>'quantity','')::numeric, 0) * COALESCE(NULLIF(e->>'rate','')::numeric, 0)
  ), 0)
  FROM jsonb_array_elements(public.as_json_array(assets)) e
$$;

CREATE OR REPLACE FUNCTION public.land_assets_value(assets jsonb)
RETURNS numeric
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(
      COALESCE(NULLIF(e->>'affected_area_perm','')::numeric, 0) * COALESCE(NULLIF(e->>'rate_perm','')::numeric, 0)
    + COALESCE(NULLIF(e->>'affected_area_temp','')::numeric, 0) * COALESCE(NULLIF(e->>'rate_temp','')::numeric, 0)
  ), 0)
  FROM jsonb_array_elements(public.as_json_array(assets)) e
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
    AND jsonb_array_length(public.as_json_array(land_assets_json)) = 0;
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
        FROM jsonb_array_elements(public.as_json_array(h.land_assets_json)) elem
      ) AS new_assets
    FROM public.households h
    WHERE h.route_type = route_type_in
      AND jsonb_array_length(public.as_json_array(h.land_assets_json)) > 0
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(public.as_json_array(h.land_assets_json)) e
         WHERE e->>'land_use' = land_use_in
      )
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
        FROM jsonb_array_elements(public.as_json_array(h.other_assets_json)) elem
      ) AS new_assets
    FROM public.households h
    WHERE jsonb_array_length(public.as_json_array(h.other_assets_json)) > 0
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(public.as_json_array(h.other_assets_json)) e
         WHERE lower(e->>'type') = lower(asset_type_in)
      )
  )
  UPDATE public.households h
  SET other_assets_json = r.new_assets,
      total_compensation = CASE
          WHEN jsonb_array_length(public.as_json_array(h.land_assets_json)) > 0
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
