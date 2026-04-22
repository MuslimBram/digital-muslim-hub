-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- AI ASSISTANTS (per workspace configuration)
-- =====================================================
CREATE TABLE public.ai_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'AI Brain',
  model TEXT NOT NULL DEFAULT 'openai/gpt-5-mini',
  system_prompt TEXT,
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.ai_assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_assistants_select" ON public.ai_assistants FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_assistants_insert" ON public.ai_assistants FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_assistants_update" ON public.ai_assistants FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_assistants_delete" ON public.ai_assistants FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER set_ai_assistants_updated_at BEFORE UPDATE ON public.ai_assistants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- AI BRAND VOICE (tone, values, audience)
-- =====================================================
CREATE TABLE public.ai_brand_voice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_name TEXT,
  industry TEXT,
  tone TEXT NOT NULL DEFAULT 'professional',
  values TEXT,
  target_audience TEXT,
  language TEXT NOT NULL DEFAULT 'sq',
  do_use TEXT,
  do_not_use TEXT,
  example_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.ai_brand_voice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_voice_select" ON public.ai_brand_voice FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "brand_voice_insert" ON public.ai_brand_voice FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "brand_voice_update" ON public.ai_brand_voice FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "brand_voice_delete" ON public.ai_brand_voice FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER set_brand_voice_updated_at BEFORE UPDATE ON public.ai_brand_voice
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- KNOWLEDGE BASE: documents + chunks
-- =====================================================
CREATE TYPE public.kb_source_type AS ENUM ('website', 'pdf', 'text', 'social');
CREATE TYPE public.kb_status AS ENUM ('pending', 'processing', 'ready', 'failed');

CREATE TABLE public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type public.kb_source_type NOT NULL,
  source_url TEXT,
  storage_path TEXT,
  status public.kb_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  chunks_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_documents_select" ON public.kb_documents FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "kb_documents_insert" ON public.kb_documents FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "kb_documents_update" ON public.kb_documents FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "kb_documents_delete" ON public.kb_documents FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER set_kb_documents_updated_at BEFORE UPDATE ON public.kb_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_kb_documents_workspace ON public.kb_documents(workspace_id, created_at DESC);

-- Chunks with embeddings
CREATE TABLE public.kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_chunks_select" ON public.kb_chunks FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "kb_chunks_insert" ON public.kb_chunks FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "kb_chunks_delete" ON public.kb_chunks FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_kb_chunks_document ON public.kb_chunks(document_id);
CREATE INDEX idx_kb_chunks_embedding ON public.kb_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Vector match function (security definer; filters by workspace)
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector(768),
  match_workspace_id UUID,
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  document_title TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enforce workspace membership
  IF NOT public.is_workspace_member(auth.uid(), match_workspace_id) THEN
    RAISE EXCEPTION 'Not a member of workspace';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    d.title AS document_title
  FROM public.kb_chunks c
  JOIN public.kb_documents d ON d.id = c.document_id
  WHERE c.workspace_id = match_workspace_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================
-- AI CONVERSATIONS + MESSAGES
-- =====================================================
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conv_select" ON public.ai_conversations FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_conv_insert" ON public.ai_conversations FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);
CREATE POLICY "ai_conv_update" ON public.ai_conversations FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_conv_delete" ON public.ai_conversations FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER set_ai_conv_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_ai_conv_workspace ON public.ai_conversations(workspace_id, updated_at DESC);

CREATE TYPE public.ai_message_role AS ENUM ('system', 'user', 'assistant', 'tool');

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role public.ai_message_role NOT NULL,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_msg_select" ON public.ai_messages FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_msg_insert" ON public.ai_messages FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_ai_msg_conv ON public.ai_messages(conversation_id, created_at);

-- =====================================================
-- AI MEMORY (long-term facts)
-- =====================================================
CREATE TYPE public.memory_scope AS ENUM ('workspace', 'business', 'contact');

CREATE TABLE public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scope public.memory_scope NOT NULL DEFAULT 'workspace',
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_memory_select" ON public.ai_memory FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_memory_insert" ON public.ai_memory FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_memory_update" ON public.ai_memory FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_memory_delete" ON public.ai_memory FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER set_ai_memory_updated_at BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_ai_memory_workspace ON public.ai_memory(workspace_id, scope);

-- =====================================================
-- STORAGE BUCKET for KB files (PDFs)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('kb-files', 'kb-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "kb_files_select_own_workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kb-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "kb_files_insert_own_workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kb-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "kb_files_delete_own_workspace"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kb-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
  )
);