-- Create Knowledge Hub tables

-- 1. Knowledge Sources: Tracks uploaded documents
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Knowledge Chunks: Stores AI-parsed content for RAG
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    grade INTEGER NOT NULL,
    lesson_id TEXT, -- Null if global/multiple
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Admin only for now)
CREATE POLICY "Admin full access to sources" ON public.knowledge_sources FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access to chunks" ON public.knowledge_chunks FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read chunks" ON public.knowledge_chunks FOR SELECT USING (true);
