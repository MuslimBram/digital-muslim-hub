-- Integration types
CREATE TYPE public.integration_type AS ENUM (
  'whatsapp_meta',
  'telegram',
  'twilio_sms',
  'resend_email',
  'instagram',
  'facebook_messenger'
);

CREATE TYPE public.integration_status AS ENUM (
  'pending',
  'active',
  'error',
  'disabled'
);

CREATE TYPE public.webhook_event_type AS ENUM (
  'message.received',
  'message.sent',
  'message.delivered',
  'message.failed',
  'conversation.created',
  'conversation.assigned',
  'conversation.closed',
  'contact.created',
  'contact.updated',
  'deal.created',
  'deal.stage_changed',
  'deal.won',
  'deal.lost',
  'ticket.created',
  'ticket.resolved',
  'call.started',
  'call.ended',
  'call.missed',
  'campaign.completed',
  'payment.received',
  'kb.indexed'
);

CREATE TYPE public.webhook_delivery_status AS ENUM (
  'pending',
  'success',
  'failed',
  'dead'
);

-- workspace_integrations: encrypted per-workspace credentials
CREATE TABLE public.workspace_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type public.integration_type NOT NULL,
  display_name TEXT NOT NULL,
  status public.integration_status NOT NULL DEFAULT 'pending',
  -- Encrypted credentials (base64 ciphertext + iv + authTag, JSON shape)
  credentials_ciphertext TEXT,
  credentials_iv TEXT,
  credentials_tag TEXT,
  -- Public, non-secret config (e.g. phone_number_id, bot_username, from_email)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Inbound webhook verification token (Meta verify_token, Telegram secret)
  inbound_secret TEXT,
  last_event_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, type, display_name)
);

CREATE INDEX idx_wi_workspace ON public.workspace_integrations(workspace_id);
CREATE INDEX idx_wi_type_status ON public.workspace_integrations(type, status);

ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners/admins manage integrations"
  ON public.workspace_integrations
  FOR ALL
  TO authenticated
  USING (
    public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin')
    OR public.is_unlimited_user(auth.uid())
  )
  WITH CHECK (
    public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin')
    OR public.is_unlimited_user(auth.uid())
  );

CREATE TRIGGER trg_wi_updated_at
  BEFORE UPDATE ON public.workspace_integrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- webhook_endpoints: outbound URLs where customers want events delivered
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  events public.webhook_event_type[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_we_workspace_active ON public.webhook_endpoints(workspace_id, is_active);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners/admins manage webhook endpoints"
  ON public.webhook_endpoints
  FOR ALL
  TO authenticated
  USING (
    public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin')
    OR public.is_unlimited_user(auth.uid())
  )
  WITH CHECK (
    public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin')
    OR public.is_unlimited_user(auth.uid())
  );

CREATE TRIGGER trg_we_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- integration_events: buffer of emitted events awaiting dispatch
CREATE TABLE public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type public.webhook_event_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ie_workspace_created ON public.integration_events(workspace_id, created_at DESC);
CREATE INDEX idx_ie_type ON public.integration_events(event_type);

ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners/admins read integration events"
  ON public.integration_events
  FOR SELECT
  TO authenticated
  USING (
    public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin')
    OR public.is_unlimited_user(auth.uid())
  );

-- webhook_deliveries: per-attempt log
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.integration_events(id) ON DELETE SET NULL,
  event_type public.webhook_event_type NOT NULL,
  payload JSONB NOT NULL,
  status public.webhook_delivery_status NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wd_pending ON public.webhook_deliveries(status, next_attempt_at)
  WHERE status = 'pending' OR status = 'failed';
CREATE INDEX idx_wd_endpoint ON public.webhook_deliveries(endpoint_id, created_at DESC);
CREATE INDEX idx_wd_workspace ON public.webhook_deliveries(workspace_id, created_at DESC);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners/admins read webhook deliveries"
  ON public.webhook_deliveries
  FOR SELECT
  TO authenticated
  USING (
    public.workspace_role_of(auth.uid(), workspace_id) IN ('owner', 'admin')
    OR public.is_unlimited_user(auth.uid())
  );

CREATE TRIGGER trg_wd_updated_at
  BEFORE UPDATE ON public.webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helper RPC: emit_integration_event (used by app code via service role usually,
-- but also callable by workspace members for manual triggers)
CREATE OR REPLACE FUNCTION public.emit_integration_event(
  _workspace_id UUID,
  _event_type public.webhook_event_type,
  _payload JSONB DEFAULT '{}'::jsonb,
  _source TEXT DEFAULT 'app'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_endpoint RECORD;
BEGIN
  -- Allow workspace members or unlimited users
  IF auth.uid() IS NOT NULL
     AND NOT public.is_workspace_member(auth.uid(), _workspace_id)
     AND NOT public.is_unlimited_user(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.integration_events (workspace_id, event_type, payload, source)
  VALUES (_workspace_id, _event_type, _payload, _source)
  RETURNING id INTO v_event_id;

  -- Fan-out to active matching endpoints
  FOR v_endpoint IN
    SELECT id FROM public.webhook_endpoints
     WHERE workspace_id = _workspace_id
       AND is_active = true
       AND _event_type = ANY(events)
  LOOP
    INSERT INTO public.webhook_deliveries
      (workspace_id, endpoint_id, event_id, event_type, payload, status, next_attempt_at)
    VALUES
      (_workspace_id, v_endpoint.id, v_event_id, _event_type, _payload, 'pending', now());
  END LOOP;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.emit_integration_event(UUID, public.webhook_event_type, JSONB, TEXT) TO authenticated;