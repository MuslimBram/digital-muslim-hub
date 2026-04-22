-- ============= ENUMS =============
CREATE TYPE public.call_direction AS ENUM ('inbound', 'outbound', 'internal');
CREATE TYPE public.call_status AS ENUM ('ringing', 'answered', 'on_hold', 'transferred', 'ended', 'missed', 'voicemail', 'failed');
CREATE TYPE public.agent_presence AS ENUM ('available', 'busy', 'away', 'offline', 'on_call', 'wrap_up');
CREATE TYPE public.queue_strategy AS ENUM ('round_robin', 'longest_idle', 'skills_based');
CREATE TYPE public.dialer_mode AS ENUM ('preview', 'progressive', 'predictive');
CREATE TYPE public.dialer_status AS ENUM ('draft', 'running', 'paused', 'completed');
CREATE TYPE public.ivr_node_type AS ENUM ('menu', 'play', 'collect', 'transfer', 'hangup', 'queue', 'voicemail');
CREATE TYPE public.call_event_type AS ENUM ('ringing', 'answered', 'hold', 'unhold', 'mute', 'unmute', 'transfer', 'hangup', 'recording_start', 'recording_stop', 'note', 'ivr_input');

-- ============= CALL QUEUES =============
CREATE TABLE public.call_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid,
  name text NOT NULL,
  description text,
  strategy public.queue_strategy NOT NULL DEFAULT 'round_robin',
  max_wait_seconds integer NOT NULL DEFAULT 300,
  sla_seconds integer NOT NULL DEFAULT 30,
  ringing_seconds integer NOT NULL DEFAULT 20,
  music_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.call_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY q_select ON public.call_queues FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY q_insert ON public.call_queues FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY q_update ON public.call_queues FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY q_delete ON public.call_queues FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_call_queues_updated BEFORE UPDATE ON public.call_queues FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_queues_workspace ON public.call_queues(workspace_id);

-- ============= QUEUE MEMBERS =============
CREATE TABLE public.queue_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  queue_id uuid NOT NULL REFERENCES public.call_queues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  skills text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(queue_id, user_id)
);
ALTER TABLE public.queue_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY qm_select ON public.queue_members FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY qm_insert ON public.queue_members FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY qm_update ON public.queue_members FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY qm_delete ON public.queue_members FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_qm_queue ON public.queue_members(queue_id);
CREATE INDEX idx_qm_user ON public.queue_members(user_id);

-- ============= AGENT STATUS =============
CREATE TABLE public.agent_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status public.agent_presence NOT NULL DEFAULT 'offline',
  reason text,
  current_call_id uuid,
  since timestamptz NOT NULL DEFAULT now(),
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY as_select ON public.agent_status FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY as_insert ON public.agent_status FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);
CREATE POLICY as_update ON public.agent_status FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);
CREATE TRIGGER trg_agent_status_updated BEFORE UPDATE ON public.agent_status FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_agent_status_ws ON public.agent_status(workspace_id, status);

-- ============= CALLS =============
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid,
  direction public.call_direction NOT NULL,
  from_number text NOT NULL,
  to_number text NOT NULL,
  contact_id uuid,
  agent_id uuid,
  queue_id uuid REFERENCES public.call_queues(id) ON DELETE SET NULL,
  status public.call_status NOT NULL DEFAULT 'ringing',
  ringing_seconds integer DEFAULT 0,
  hold_seconds integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  wait_seconds integer DEFAULT 0,
  recording_id uuid,
  notes text,
  disposition text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY c_select ON public.calls FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY c_insert ON public.calls FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY c_update ON public.calls FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY c_delete ON public.calls FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_calls_updated BEFORE UPDATE ON public.calls FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_calls_workspace_started ON public.calls(workspace_id, started_at DESC);
CREATE INDEX idx_calls_agent ON public.calls(agent_id, started_at DESC);
CREATE INDEX idx_calls_queue ON public.calls(queue_id, started_at DESC);
CREATE INDEX idx_calls_status ON public.calls(workspace_id, status);

-- ============= CALL EVENTS =============
CREATE TABLE public.call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  event_type public.call_event_type NOT NULL,
  actor_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ce_select ON public.call_events FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY ce_insert ON public.call_events FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_call_events_call ON public.call_events(call_id, at);

-- ============= CALL RECORDINGS =============
CREATE TABLE public.call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  file_size_bytes bigint DEFAULT 0,
  mime_type text DEFAULT 'audio/mpeg',
  transcript text,
  transcript_status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_select ON public.call_recordings FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY cr_insert ON public.call_recordings FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY cr_update ON public.call_recordings FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY cr_delete ON public.call_recordings FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_recordings_call ON public.call_recordings(call_id);

-- ============= IVR FLOWS =============
CREATE TABLE public.ivr_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid,
  name text NOT NULL,
  description text,
  language text NOT NULL DEFAULT 'sq',
  is_active boolean NOT NULL DEFAULT false,
  root_node_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ivr_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY ivr_select ON public.ivr_flows FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY ivr_insert ON public.ivr_flows FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY ivr_update ON public.ivr_flows FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY ivr_delete ON public.ivr_flows FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_ivr_flows_updated BEFORE UPDATE ON public.ivr_flows FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= IVR NODES =============
CREATE TABLE public.ivr_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  flow_id uuid NOT NULL REFERENCES public.ivr_flows(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.ivr_nodes(id) ON DELETE CASCADE,
  type public.ivr_node_type NOT NULL,
  label text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ivr_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ivrn_select ON public.ivr_nodes FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY ivrn_insert ON public.ivr_nodes FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY ivrn_update ON public.ivr_nodes FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY ivrn_delete ON public.ivr_nodes FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_ivr_nodes_flow ON public.ivr_nodes(flow_id);

-- ============= DIALER CAMPAIGNS (placeholder, jo në UI Standard) =============
CREATE TABLE public.dialer_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid,
  name text NOT NULL,
  mode public.dialer_mode NOT NULL DEFAULT 'preview',
  status public.dialer_status NOT NULL DEFAULT 'draft',
  queue_id uuid REFERENCES public.call_queues(id) ON DELETE SET NULL,
  contact_ids uuid[] NOT NULL DEFAULT '{}',
  script text,
  total_calls integer DEFAULT 0,
  completed_calls integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dialer_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY dc_select ON public.dialer_campaigns FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY dc_insert ON public.dialer_campaigns FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY dc_update ON public.dialer_campaigns FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY dc_delete ON public.dialer_campaigns FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_dialer_updated BEFORE UPDATE ON public.dialer_campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= AGENT SCHEDULES (placeholder) =============
CREATE TABLE public.agent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  queue_ids uuid[] NOT NULL DEFAULT '{}',
  break_minutes integer DEFAULT 30,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY sched_select ON public.agent_schedules FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY sched_insert ON public.agent_schedules FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY sched_update ON public.agent_schedules FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY sched_delete ON public.agent_schedules FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============= STORAGE BUCKET =============
INSERT INTO storage.buckets (id, name, public) VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rec_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'call-recordings' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "rec_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'call-recordings' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "rec_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'call-recordings' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- ============= REALTIME =============
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_queues;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.call_events REPLICA IDENTITY FULL;
ALTER TABLE public.agent_status REPLICA IDENTITY FULL;