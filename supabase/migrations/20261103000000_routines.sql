-- ==============================================================================
-- JARVIS CUSTOM ROUTINES & MACROS SCHEMA
-- Migration: 20261103000000_routines.sql
-- Description: Custom user-defined voice macros and chained operational routines.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_name TEXT NOT NULL,
    voice_trigger TEXT NOT NULL,
    description TEXT,
    steps JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Optimization indexes
CREATE INDEX IF NOT EXISTS idx_routines_user_active ON public.routines(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_routines_voice_trigger ON public.routines(voice_trigger);

-- Enable Row Level Security
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Per-user isolation)
CREATE POLICY "Users can view their own routines"
    ON public.routines FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routines"
    ON public.routines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines"
    ON public.routines FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines"
    ON public.routines FOR DELETE
    USING (auth.uid() = user_id);
