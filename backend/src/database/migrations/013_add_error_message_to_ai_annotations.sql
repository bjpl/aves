-- Add error_message column to ai_annotations table for better error tracking
-- Migration: 013_add_error_message_to_ai_annotations

-- Add error_message column to store failure details
ALTER TABLE ai_annotations
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ai_annotations.error_message IS 'Stores error message when status is failed, null otherwise';

-- Create index for failed jobs (useful for monitoring and debugging)
CREATE INDEX IF NOT EXISTS idx_ai_annotations_failed_jobs ON ai_annotations(status, created_at DESC)
  WHERE status = 'failed';

-- Create index for processing jobs to detect stuck jobs
CREATE INDEX IF NOT EXISTS idx_ai_annotations_processing_jobs ON ai_annotations(status, created_at DESC)
  WHERE status = 'processing';
