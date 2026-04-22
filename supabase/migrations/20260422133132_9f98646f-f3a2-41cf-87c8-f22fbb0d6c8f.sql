
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_security_code(_user_id uuid, _code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _code IS NULL OR length(_code) < 4 OR length(_code) > 12 THEN
    RAISE EXCEPTION 'Invalid security code length';
  END IF;
  UPDATE public.profiles
     SET security_code_hash = encode(digest(_code, 'sha256'), 'hex'),
         updated_at = now()
   WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_security_code(_user_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored text;
BEGIN
  IF _user_id <> auth.uid() THEN
    RETURN false;
  END IF;
  SELECT security_code_hash INTO stored FROM public.profiles WHERE id = _user_id;
  IF stored IS NULL THEN RETURN false; END IF;
  RETURN stored = encode(digest(_code, 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_replies_used_today(_workspace_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.credit_usage
  WHERE workspace_id = _workspace_id
    AND usage_date = CURRENT_DATE
    AND kind = 'ai_reply'::public.credit_kind;
$$;

CREATE OR REPLACE FUNCTION public.record_credit_usage(
  _workspace_id uuid,
  _kind public.credit_kind,
  _amount integer DEFAULT 1,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_unlimited boolean;
  v_used integer := 0;
  v_limit integer := 0;
  v_plan_row record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;
  IF NOT public.is_workspace_member(v_user_id, _workspace_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  v_unlimited := public.is_unlimited_user(v_user_id);

  IF NOT v_unlimited THEN
    SELECT p.daily_image_credits, p.daily_video_seconds, p.max_ai_replies_daily
      INTO v_plan_row
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
     WHERE s.workspace_id = _workspace_id
     LIMIT 1;

    IF _kind IN ('image_gen'::public.credit_kind, 'image_upload'::public.credit_kind) THEN
      v_used := public.get_image_credits_used_today(_workspace_id);
      v_limit := COALESCE(v_plan_row.daily_image_credits, 0);
    ELSIF _kind IN ('video_gen'::public.credit_kind, 'video_upload'::public.credit_kind) THEN
      v_used := public.get_video_seconds_used_today(_workspace_id);
      v_limit := COALESCE(v_plan_row.daily_video_seconds, 0);
    ELSIF _kind = 'ai_reply'::public.credit_kind THEN
      v_used := public.get_ai_replies_used_today(_workspace_id);
      v_limit := COALESCE(v_plan_row.max_ai_replies_daily, 0);
    END IF;

    IF v_used + _amount > v_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'limit_reached', 'used', v_used, 'limit', v_limit);
    END IF;
  END IF;

  INSERT INTO public.credit_usage (workspace_id, user_id, kind, amount, metadata)
  VALUES (_workspace_id, v_user_id, _kind, _amount, _metadata);

  RETURN jsonb_build_object('ok', true, 'used', v_used + _amount, 'limit', v_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.workspace_access_state(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_unlimited boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_unlimited := public.is_unlimited_user(auth.uid());
  END IF;
  IF v_unlimited THEN
    RETURN jsonb_build_object('blocked', false, 'reason', 'unlimited');
  END IF;

  SELECT status, trial_ends_at, current_period_end
    INTO v_sub
    FROM public.subscriptions
   WHERE workspace_id = _workspace_id
   LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('blocked', false, 'reason', 'no_subscription');
  END IF;

  IF v_sub.status = 'active' THEN
    RETURN jsonb_build_object('blocked', false, 'reason', 'active');
  END IF;
  IF v_sub.status = 'trialing' AND v_sub.trial_ends_at > now() THEN
    RETURN jsonb_build_object('blocked', false, 'reason', 'trialing');
  END IF;

  RETURN jsonb_build_object('blocked', true, 'reason', v_sub.status);
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-trials-hourly') THEN
    PERFORM cron.unschedule('expire-trials-hourly');
  END IF;
  PERFORM cron.schedule(
    'expire-trials-hourly',
    '0 * * * *',
    $cron$
    UPDATE public.subscriptions
       SET status = 'past_due', updated_at = now()
     WHERE status = 'trialing'
       AND trial_ends_at < now();
    $cron$
  );
END $$;
