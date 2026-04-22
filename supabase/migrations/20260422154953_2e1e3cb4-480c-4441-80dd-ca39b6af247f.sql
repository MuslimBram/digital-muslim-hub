-- Engine type enum
CREATE TYPE public.engine_type AS ENUM (
  'growth',
  'revenue',
  'pricing',
  'funnel',
  'retention',
  'viral',
  'personalization',
  'demand',
  'workforce'
);

-- Engine run status
CREATE TYPE public.engine_run_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

-- Main table for engine runs
CREATE TABLE public.engine_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  engine engine_type NOT NULL,
  status engine_run_status NOT NULL DEFAULT 'pending',
  score INTEGER CHECK (score >= 0 AND score <= 100),
  summary TEXT,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  triggered_by_user UUID,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_engine_runs_ws_engine_created ON public.engine_runs (workspace_id, engine, created_at DESC);
CREATE INDEX idx_engine_runs_status ON public.engine_runs (status) WHERE status IN ('pending','running');

ALTER TABLE public.engine_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY engine_runs_select ON public.engine_runs
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY engine_runs_insert ON public.engine_runs
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Per-engine "latest run" views
CREATE OR REPLACE VIEW public.v_engine_growth AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'growth' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_engine_revenue AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'revenue' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_engine_pricing AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'pricing' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_engine_funnel AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'funnel' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_engine_retention AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'retention' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_engine_viral AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'viral' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_engine_personalization AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'personalization' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_engine_demand AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'demand' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_engine_workforce AS
  SELECT DISTINCT ON (workspace_id) * FROM public.engine_runs
  WHERE engine = 'workforce' AND status = 'completed'
  ORDER BY workspace_id, created_at DESC;