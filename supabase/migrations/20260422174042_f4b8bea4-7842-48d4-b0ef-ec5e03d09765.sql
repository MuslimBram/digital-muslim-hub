-- Social media accounts (Instagram, Facebook, LinkedIn, TikTok, YouTube, etc.)
-- Tokens are encrypted at the application layer before storage.

CREATE TYPE public.social_provider AS ENUM (
  'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube',
  'twitter', 'threads', 'bluesky', 'mastodon', 'pinterest',
  'google_business', 'start_page', 'custom'
);

CREATE TYPE public.social_account_kind AS ENUM (
  'profile', 'page', 'group', 'channel', 'business', 'creator', 'personal'
);

CREATE TYPE public.social_account_status AS ENUM (
  'connected', 'disconnected', 'expired', 'error', 'pending'
);

CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid,
  provider public.social_provider NOT NULL,
  kind public.social_account_kind NOT NULL DEFAULT 'profile',
  status public.social_account_status NOT NULL DEFAULT 'pending',

  -- Public account info
  account_id text,           -- provider-side ID
  username text,
  display_name text,
  avatar_url text,
  profile_url text,

  -- Encrypted credentials (AES-256-GCM, like workspace_integrations)
  access_token_ciphertext text,
  access_token_iv text,
  access_token_tag text,
  refresh_token_ciphertext text,
  refresh_token_iv text,
  refresh_token_tag text,
  token_expires_at timestamptz,
  scopes text[] DEFAULT '{}',

  -- Metadata
  config jsonb NOT NULL DEFAULT '{}',
  last_synced_at timestamptz,
  last_error text,

  connected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, provider, account_id)
);

CREATE INDEX idx_social_accounts_workspace ON public.social_accounts(workspace_id);
CREATE INDEX idx_social_accounts_provider ON public.social_accounts(workspace_id, provider);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- All workspace members can VIEW which accounts are connected.
CREATE POLICY "social_accounts_select" ON public.social_accounts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Only workspace owners/admins (or platform owner/admin) can INSERT/UPDATE/DELETE.
CREATE POLICY "social_accounts_insert" ON public.social_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin'))
    OR public.is_unlimited_user(auth.uid())
  );

CREATE POLICY "social_accounts_update" ON public.social_accounts
  FOR UPDATE TO authenticated
  USING (
    (public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin'))
    OR public.is_unlimited_user(auth.uid())
  );

CREATE POLICY "social_accounts_delete" ON public.social_accounts
  FOR DELETE TO authenticated
  USING (
    (public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin'))
    OR public.is_unlimited_user(auth.uid())
  );

CREATE TRIGGER trg_social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable realtime so the UI updates when an OAuth callback completes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_accounts;