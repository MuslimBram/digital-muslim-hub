-- ============================================================
-- PHASE 4: MONETIZATION CORE
-- ============================================================

-- ENUMS (owner already added in previous migration)
CREATE TYPE public.account_type AS ENUM ('business', 'freelancer', 'ambassador');
CREATE TYPE public.plan_tier AS ENUM ('start', 'growth', 'professional', 'enterprise');
CREATE TYPE public.billing_cycle AS ENUM ('trial', 'monthly', 'quarterly', 'biannual', 'yearly');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired', 'blocked');
CREATE TYPE public.credit_kind AS ENUM ('image_gen', 'image_upload', 'video_gen', 'video_upload');
CREATE TYPE public.wallet_tx_type AS ENUM ('referral_commission', 'donation_received', 'withdrawal', 'adjustment');
CREATE TYPE public.donation_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- 1. PLANS CATALOG
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier public.plan_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  max_channels INTEGER NOT NULL,
  max_ai_replies_daily INTEGER NOT NULL,
  max_team_members INTEGER NOT NULL,
  max_businesses INTEGER NOT NULL,
  daily_image_credits INTEGER NOT NULL,
  daily_video_seconds INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.plans (tier, name, monthly_price_cents, max_channels, max_ai_replies_daily, max_team_members, max_businesses, daily_image_credits, daily_video_seconds, features, sort_order) VALUES
  ('start',        'Start',        4900,  3,  25,  2,  1, 5,  30,  '["unified_inbox","crm","pipeline","ai_assistant"]'::jsonb, 1),
  ('growth',       'Growth',       9900,  8,  100, 5,  3, 15, 120, '["unified_inbox","crm","pipeline","ai_assistant","automation","analytics"]'::jsonb, 2),
  ('professional', 'Professional', 19900, 15, 200, 15, 5, 50, 300, '["unified_inbox","crm","pipeline","ai_assistant","automation","analytics","call_center","ivr","wallboard"]'::jsonb, 3),
  ('enterprise',   'Enterprise',   39900, 999, 9999, 999, 99, 9999, 9999, '["everything","priority_support","sso","custom_integrations"]'::jsonb, 4);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_select_all ON public.plans FOR SELECT TO authenticated USING (true);

-- 2. PROFILE EXTENSIONS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type public.account_type NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS security_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- 3. SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  account_type public.account_type NOT NULL DEFAULT 'business',
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'trial',
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  delete_after TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  paddle_subscription_id TEXT,
  paddle_customer_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_workspace ON public.subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_delete_after ON public.subscriptions(delete_after) WHERE delete_after IS NOT NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subs_select ON public.subscriptions FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY subs_update ON public.subscriptions FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY subs_insert ON public.subscriptions FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER subs_touch BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. CREDIT USAGE
CREATE TABLE public.credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  kind public.credit_kind NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_usage_lookup ON public.credit_usage(workspace_id, usage_date, kind);

ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY credit_select ON public.credit_usage FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY credit_insert ON public.credit_usage FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

-- 5. REFERRALS
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  referred_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  total_commission_cents BIGINT NOT NULL DEFAULT 0,
  signup_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_payment_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY ref_select_own ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- 6. WALLETS
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  total_earned_cents BIGINT NOT NULL DEFAULT 0,
  total_withdrawn_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_select_own ON public.wallets FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER wallets_touch BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7. WALLET TRANSACTIONS
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tx_type public.wallet_tx_type NOT NULL,
  amount_cents BIGINT NOT NULL,
  description TEXT,
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY walletx_select_own ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- 8. DONATIONS
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_user_id UUID,
  donor_name TEXT,
  donor_email TEXT,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  message TEXT,
  paypal_order_id TEXT UNIQUE,
  paypal_capture_id TEXT,
  status public.donation_status NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY donation_insert_self ON public.donations FOR INSERT WITH CHECK (auth.uid() = donor_user_id OR donor_user_id IS NULL);
CREATE POLICY donation_select_own ON public.donations FOR SELECT USING (auth.uid() = donor_user_id);

-- 9. SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.is_unlimited_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_image_credit_limit(_workspace_id UUID, _user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  IF public.is_unlimited_user(_user_id) THEN
    RETURN 999999;
  END IF;
  SELECT p.daily_image_credits INTO v_limit
  FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id
  WHERE s.workspace_id = _workspace_id AND s.status IN ('trialing', 'active');
  RETURN COALESCE(v_limit, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_image_credits_used_today(_workspace_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.credit_usage
  WHERE workspace_id = _workspace_id
    AND usage_date = CURRENT_DATE
    AND kind IN ('image_gen', 'image_upload');
$$;

CREATE OR REPLACE FUNCTION public.get_video_seconds_used_today(_workspace_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.credit_usage
  WHERE workspace_id = _workspace_id
    AND usage_date = CURRENT_DATE
    AND kind IN ('video_gen', 'video_upload');
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN UPPER(SUBSTRING(REPLACE(_user_id::TEXT, '-', ''), 1, 8));
END;
$$;

-- 10. UPDATED handle_new_user TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  -- Create workspace
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

  -- Subscription with 7-day trial (skip for ambassadors)
  IF v_account_type <> 'ambassador' THEN
    SELECT id INTO v_plan_id FROM public.plans WHERE tier = COALESCE((NEW.raw_user_meta_data->>'selected_plan')::public.plan_tier, 'start');
    INSERT INTO public.subscriptions (workspace_id, plan_id, account_type, billing_cycle, status)
    VALUES (new_workspace_id, v_plan_id, v_account_type, 'trial', 'trialing');
  END IF;

  -- Wallet
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);

  -- Track referral
  IF v_referred_by IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_user_id, referred_workspace_id)
    VALUES (v_referred_by, NEW.id, new_workspace_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. ADMIN/OWNER GLOBAL VIEW POLICIES
CREATE POLICY subs_admin_select ON public.subscriptions FOR SELECT
  USING (public.is_unlimited_user(auth.uid()));

CREATE POLICY donation_admin_select ON public.donations FOR SELECT
  USING (public.is_unlimited_user(auth.uid()));

CREATE POLICY ref_admin_select ON public.referrals FOR SELECT
  USING (public.is_unlimited_user(auth.uid()));

CREATE POLICY wallet_admin_select ON public.wallets FOR SELECT
  USING (public.is_unlimited_user(auth.uid()));