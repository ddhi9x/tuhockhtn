
-- Table to store simulation assignments per lesson (multiple sims per lesson)
CREATE TABLE public.lesson_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  lesson_name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  sim_type TEXT NOT NULL, -- e.g. 'friction', 'circuit', 'ph_scale', 'atom', 'cell', 'states_of_matter'
  title TEXT NOT NULL, -- display title
  description TEXT, -- optional description
  config JSONB DEFAULT '{}'::jsonb, -- custom params like {voltage_min: 1, voltage_max: 24}
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_simulations ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read simulations"
ON public.lesson_simulations FOR SELECT
USING (true);

-- Public write (no auth system yet)
CREATE POLICY "Anyone can insert simulations"
ON public.lesson_simulations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update simulations"
ON public.lesson_simulations FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete simulations"
ON public.lesson_simulations FOR DELETE
USING (true);

-- Index for fast lookup
CREATE INDEX idx_lesson_simulations_lesson_id ON public.lesson_simulations(lesson_id);
