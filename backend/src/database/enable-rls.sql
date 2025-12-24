-- Enable Row Level Security (RLS) on all public tables
-- This script addresses the security warnings from Supabase

-- Enable RLS on each table
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

-- Create a policy that allows all operations for authenticated users
-- You can make these more restrictive based on your needs

-- Users table - users can only see/edit their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Public read access for species and images (educational content)
CREATE POLICY "Public read access" ON public.species
    FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.images
    FOR SELECT USING (true);

-- Annotations - users can manage their own
CREATE POLICY "Users can view own annotations" ON public.annotations
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create annotations" ON public.annotations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations" ON public.annotations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations" ON public.annotations
    FOR DELETE USING (auth.uid() = user_id);

-- AI Annotations - similar to regular annotations
CREATE POLICY "Users can view AI annotations" ON public.ai_annotations
    FOR SELECT USING (true); -- Public read

CREATE POLICY "System can create AI annotations" ON public.ai_annotations
    FOR INSERT WITH CHECK (true); -- Your backend handles auth

-- Exercise cache - public read, system write
CREATE POLICY "Public can read exercises" ON public.exercise_cache
    FOR SELECT USING (true);

CREATE POLICY "System can manage exercises" ON public.exercise_cache
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Vision AI cache - similar pattern
CREATE POLICY "Public read vision cache" ON public.vision_ai_cache
    FOR SELECT USING (true);

CREATE POLICY "System manages vision cache" ON public.vision_ai_cache
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Batch jobs - only service role
CREATE POLICY "Service role only" ON public.batch_jobs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role only" ON public.batch_job_errors
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- AI annotation items and reviews
CREATE POLICY "Public read AI items" ON public.ai_annotation_items
    FOR SELECT USING (true);

CREATE POLICY "System manages AI items" ON public.ai_annotation_items
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can create reviews" ON public.ai_annotation_reviews
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view reviews" ON public.ai_annotation_reviews
    FOR SELECT USING (true);

-- Migrations table - service role only
CREATE POLICY "Service role only" ON public.migrations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Note: These are basic policies. You should adjust them based on your specific requirements.
-- For example, you might want to add more restrictive policies based on user roles or other conditions.