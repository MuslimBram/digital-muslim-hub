
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'business', 'freelancer', 'partner');
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.channel_type AS ENUM ('whatsapp', 'telegram', 'email', 'sms', 'webchat');
CREATE TYPE public.conversation_status AS ENUM ('open', 'pending', 'resolved', 'closed');
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.contact_status AS ENUM ('lead', 'qualified', 'customer', 'churned');
CREATE TYPE public.deal_status AS ENUM ('open', 'won', 'lost');
CREATE TYPE public.ticket_status AS ENUM ('new', 'open', 'pending', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'running', 'completed', 'paused');

-- TABLES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'sq',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  telegram_username TEXT,
  status public.contact_status NOT NULL DEFAULT 'lead',
  source TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.contacts(workspace_id);
CREATE INDEX ON public.contacts(status);

CREATE TABLE public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#4f46e5',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status public.deal_status NOT NULL DEFAULT 'open',
  expected_close_date DATE,
  position INT NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.deals(workspace_id);
CREATE INDEX ON public.deals(pipeline_id, stage_id);

CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  type public.channel_type NOT NULL,
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  subject TEXT,
  status public.conversation_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.conversations(workspace_id, status);
CREATE INDEX ON public.conversations(last_message_at DESC);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction public.message_direction NOT NULL,
  body TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.messages(conversation_id, created_at);

CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type public.channel_type NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status public.ticket_status NOT NULL DEFAULT 'new',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tickets(workspace_id, status);

CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger JSONB NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id)
$$;

CREATE OR REPLACE FUNCTION public.workspace_role_of(_user_id UUID, _workspace_id UUID)
RETURNS public.workspace_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id LIMIT 1
$$;

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- POLICIES: profiles + roles + workspaces
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workspaces_select_member" ON public.workspaces FOR SELECT USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "workspaces_insert_owner" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "workspaces_update_owner" ON public.workspaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "workspaces_delete_owner" ON public.workspaces FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "members_select" ON public.workspace_members FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members_insert_self" ON public.workspace_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TENANT TABLE POLICIES (loop only over tables with workspace_id)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'businesses','contacts','pipelines','deals',
    'channels','conversations','messages','message_templates',
    'campaigns','tickets','workflows'
  ])
  LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON public.%1$I FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON public.%1$I FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON public.%1$I FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));$f$, t);
  END LOOP;
END $$;

-- pipeline_stages: check via parent pipeline
CREATE POLICY "stages_select" ON public.pipeline_stages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND public.is_workspace_member(auth.uid(), p.workspace_id)));
CREATE POLICY "stages_insert" ON public.pipeline_stages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND public.is_workspace_member(auth.uid(), p.workspace_id)));
CREATE POLICY "stages_update" ON public.pipeline_stages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND public.is_workspace_member(auth.uid(), p.workspace_id)));
CREATE POLICY "stages_delete" ON public.pipeline_stages FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND public.is_workspace_member(auth.uid(), p.workspace_id)));

-- TRIGGERS: updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','workspaces','businesses','contacts','deals',
    'conversations','campaigns','tickets','workflows'
  ])
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t);
  END LOOP;
END $$;

-- Auto-create profile + workspace + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_workspace_id UUID;
  new_pipeline_id UUID;
  ws_slug TEXT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'business');

  ws_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g')) || '-' || substring(NEW.id::text, 1, 6);
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'workspace_name', split_part(NEW.email, '@', 1) || ' workspace'), ws_slug, NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

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

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
