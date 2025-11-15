-- Simple RLS Enable Script for Supabase SQL Editor
-- Run this in your Supabase SQL editor to enable basic RLS

-- Step 1: Enable RLS on all tables (this is the minimum required)
ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_annotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_annotation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_job_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a temporary "allow all" policy for service role
-- This allows your backend (using service role key) to access everything
-- while still having RLS enabled (which satisfies the security requirement)

CREATE POLICY "Service role bypass" ON public.migrations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.ai_annotations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.ai_annotation_items
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.ai_annotation_reviews
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.vision_ai_cache
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.batch_jobs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.batch_job_errors
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.exercise_cache
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.species
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.images
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON public.annotations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- This enables RLS (satisfying the security requirement)
-- but allows your backend to work normally using the service role key