
-- ============================================================================
-- FAZA 9: SECURITY HARDENING
-- 1. Migron të gjitha politikat RLS nga rolin 'public' në 'authenticated'
--    (bllokon plotësisht anonymous access në të dhëna user-specifike)
-- 2. Shton trigger që zbaton kufizimin e workspace-eve sipas account_type:
--    - business: max 1 workspace
--    - freelancer: 1 workspace për çdo abonim aktiv (default 1)
--    - ambassador: 0 workspace
--    - owner/admin: pa limit
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: Migrate all RLS policies from 'public' to 'authenticated' role
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
  cmd_text TEXT;
  using_clause TEXT;
  check_clause TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check, permissive
      FROM pg_policies
     WHERE schemaname = 'public'
       AND 'public' = ANY(roles)
  LOOP
    -- Drop existing policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    -- Build new policy targeted at 'authenticated'
    cmd_text := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO authenticated',
                      pol.policyname, pol.schemaname, pol.tablename,
                      CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                      pol.cmd);

    IF pol.qual IS NOT NULL THEN
      cmd_text := cmd_text || ' USING (' || pol.qual || ')';
    END IF;

    IF pol.with_check IS NOT NULL THEN
      cmd_text := cmd_text || ' WITH CHECK (' || pol.with_check || ')';
    END IF;

    EXECUTE cmd_text;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- PART 2: Workspace creation limits by account_type
-- ----------------------------------------------------------------------------

-- Helper: count active subscriptions for a user across all their workspaces
CREATE OR REPLACE FUNCTION public.count_user_active_subscriptions(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
    FROM public.subscriptions s
    JOIN public.workspaces w ON w.id = s.workspace_id
   WHERE w.owner_id = _user_id
     AND s.status IN ('active', 'trialing');
$$;

CREATE OR REPLACE FUNCTION public.enforce_workspace_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type public.account_type;
  v_existing_count integer;
  v_active_subs integer;
BEGIN
  -- Owner/Admin -> unlimited
  IF public.is_unlimited_user(NEW.owner_id) THEN
    RETURN NEW;
  END IF;

  SELECT account_type INTO v_account_type
    FROM public.profiles
   WHERE id = NEW.owner_id;

  IF v_account_type IS NULL THEN
    v_account_type := 'business';
  END IF;

  SELECT COUNT(*) INTO v_existing_count
    FROM public.workspaces
   WHERE owner_id = NEW.owner_id;

  IF v_account_type = 'ambassador' THEN
    RAISE EXCEPTION 'Ambassador accounts cannot own workspaces' USING ERRCODE = 'P0001';
  ELSIF v_account_type = 'business' THEN
    IF v_existing_count >= 1 THEN
      RAISE EXCEPTION 'Business accounts are limited to 1 workspace' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_account_type = 'freelancer' THEN
    -- Allow 1 workspace by default + 1 per active paid subscription beyond the first
    v_active_subs := public.count_user_active_subscriptions(NEW.owner_id);
    -- Cap = max(1, active_subs). First workspace allowed even without paid sub (trial).
    IF v_existing_count >= GREATEST(1, v_active_subs) THEN
      RAISE EXCEPTION 'Freelancer plan limit reached (%). Upgrade or pay for an additional workspace to add more.', v_existing_count
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_workspace_limit ON public.workspaces;
CREATE TRIGGER trg_enforce_workspace_limit
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_workspace_limit();

-- ----------------------------------------------------------------------------
-- PART 3: Patch handle_new_user to skip workspace creation for ambassadors
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
  new_pipeline_id UUID;
  ws_slug TEXT;
  v_account_type public.account_type;
  v_plan_id UUID;
  v_referral_code TEXT;
  v_referred_by UUID;
  v_referrer_code TEXT;
  v_role public.app_role;
BEGIN
  v_account_type := COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'business');

  v_referrer_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referrer_code IS NOT NULL AND v_referrer_code <> '' THEN
    SELECT id INTO v_referred_by FROM public.profiles WHERE referral_code = v_referrer_code;
  END IF;

  v_referral_code := public.generate_referral_code(NEW.id);

  INSERT INTO public.profiles (id, email, full_name, account_type, company_name, security_code_hash, referral_code, referred_by, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_account_type,
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'security_code_hash',
    v_referral_code,
    v_referred_by,
    NEW.raw_user_meta_data->>'phone'
  );

  -- Auto-promote owner/admin by email
  IF NEW.email = 'muslim.brami@gmail.com' THEN
    v_role := 'owner';
  ELSIF NEW.email = 'muslimani181@gmail.com' THEN
    v_role := 'admin';
  ELSE
    v_role := CASE v_account_type
      WHEN 'freelancer' THEN 'freelancer'::public.app_role
      WHEN 'ambassador' THEN 'partner'::public.app_role
      ELSE 'business'::public.app_role
    END;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  -- Wallet always created
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);

  -- Ambassadors do NOT get a workspace
  IF v_account_type = 'ambassador' THEN
    -- Track referral if any
    IF v_referred_by IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_user_id, referred_workspace_id)
      VALUES (v_referred_by, NEW.id, NULL);
    END IF;
    RETURN NEW;
  END IF;

  -- Create workspace for business/freelancer
  ws_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g')) || '-' || substring(NEW.id::text, 1, 6);
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'workspace_name', split_part(NEW.email, '@', 1) || ' workspace'),
    ws_slug,
    NEW.id
  )
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  -- Default pipeline
  INSERT INTO public.pipelines (workspace_id, name, is_default)
  VALUES (new_workspace_id, 'Sales Pipeline', true)
  RETURNING id INTO new_pipeline_id;

  INSERT INTO public.pipeline_stages (pipeline_id, name, position, color) VALUES
    (new_pipeline_id, 'New', 0, '#6366f1'),
    (new_pipeline_id, 'Qualified', 1, '#8b5cf6'),
    (new_pipeline_id, 'Proposal', 2, '#06b6d4'),
    (new_pipeline_id, 'Negotiation', 3, '#f59e0b'),
    (new_pipeline_id, 'Won', 4, '#10b981'),
    (new_pipeline_id, 'Lost', 5, '#ef4444');

  -- Subscription with 7-day trial
  SELECT id INTO v_plan_id FROM public.plans WHERE tier = COALESCE((NEW.raw_user_meta_data->>'selected_plan')::public.plan_tier, 'start');
  INSERT INTO public.subscriptions (workspace_id, plan_id, account_type, billing_cycle, status)
  VALUES (new_workspace_id, v_plan_id, v_account_type, 'trial', 'trialing');

  -- Track referral
  IF v_referred_by IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_user_id, referred_workspace_id)
    VALUES (v_referred_by, NEW.id, new_workspace_id);
  END IF;

  RETURN NEW;
END;
$$;
