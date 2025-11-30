-- Migration: Create Exercise Pipeline Tables
-- Description: Creates tables for annotation exercise pipeline tracking
-- Created: 2025-11-29

-- Create annotation_exercise_pipeline_log table
CREATE TABLE IF NOT EXISTS annotation_exercise_pipeline_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
  user_id TEXT,
  exercises_generated INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_dates CHECK (completed_at IS NULL OR completed_at >= created_at)
);

-- Add columns to existing exercise_cache table if they don't exist
ALTER TABLE exercise_cache
  ADD COLUMN IF NOT EXISTS annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS accessed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

-- Create user_species_interactions table for tracking which users have viewed which species
CREATE TABLE IF NOT EXISTS user_species_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('view', 'learn', 'practice', 'annotate')) NOT NULL,
  interaction_count INTEGER DEFAULT 1,
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, species_id, interaction_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_log_annotation_id ON annotation_exercise_pipeline_log(annotation_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_log_user_id ON annotation_exercise_pipeline_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_log_status ON annotation_exercise_pipeline_log(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_log_created_at ON annotation_exercise_pipeline_log(created_at DESC);

-- Add new index for annotation_id on exercise_cache if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_exercise_cache_annotation_id ON exercise_cache(annotation_id);

CREATE INDEX IF NOT EXISTS idx_user_species_user_id ON user_species_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_species_species_id ON user_species_interactions(species_id);
CREATE INDEX IF NOT EXISTS idx_user_species_interaction_type ON user_species_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_species_last_interaction ON user_species_interactions(last_interaction_at DESC);

-- Add comments for documentation
COMMENT ON TABLE annotation_exercise_pipeline_log IS 'Tracks exercise generation pipeline jobs for approved annotations';
COMMENT ON TABLE user_species_interactions IS 'Tracks user interactions with species for targeted exercise generation';

COMMENT ON COLUMN annotation_exercise_pipeline_log.status IS 'Pipeline job status: pending, processing, completed, or failed';
COMMENT ON COLUMN user_species_interactions.interaction_type IS 'Type of user interaction with species';