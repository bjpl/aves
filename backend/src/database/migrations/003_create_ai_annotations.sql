-- AI Annotation Jobs and Review Workflow
-- Migration: 003_create_ai_annotations

-- Create enum types for better type safety and performance
DO $$ BEGIN
  CREATE TYPE ai_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_provider AS ENUM ('openai', 'google', 'anthropic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AI Annotation Jobs table
-- Tracks background jobs for AI-generated annotations
CREATE TABLE IF NOT EXISTS ai_annotation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  status ai_job_status NOT NULL DEFAULT 'pending',
  provider ai_provider NOT NULL,
  request_payload JSONB NOT NULL,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Ensure completed_at is set when status is completed or failed
  CONSTRAINT check_completed_at CHECK (
    (status IN ('completed', 'failed') AND completed_at IS NOT NULL) OR
    (status IN ('pending', 'processing') AND completed_at IS NULL)
  )
);

-- Add AI-related columns to annotations table
ALTER TABLE annotations
  ADD COLUMN IF NOT EXISTS vision_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vision_confidence DECIMAL(5,4) CHECK (vision_confidence >= 0 AND vision_confidence <= 1),
  ADD COLUMN IF NOT EXISTS vision_provider ai_provider,
  ADD COLUMN IF NOT EXISTS review_status review_status DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ai_job_id UUID REFERENCES ai_annotation_jobs(id) ON DELETE SET NULL;

-- Add constraint to ensure AI-generated annotations have confidence score
ALTER TABLE annotations
  ADD CONSTRAINT check_vision_confidence CHECK (
    (vision_generated = true AND vision_confidence IS NOT NULL) OR
    (vision_generated = false)
  );

-- Add constraint to ensure AI-generated annotations have provider
ALTER TABLE annotations
  ADD CONSTRAINT check_vision_provider CHECK (
    (vision_generated = true AND vision_provider IS NOT NULL) OR
    (vision_generated = false)
  );

-- Add constraint to ensure reviewed annotations have reviewer and timestamp
ALTER TABLE annotations
  ADD CONSTRAINT check_review_metadata CHECK (
    (review_status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR
    (review_status = 'pending')
  );

-- Add constraint to validate bounding box structure
ALTER TABLE annotations
  ADD CONSTRAINT check_bounding_box_structure CHECK (
    jsonb_typeof(bounding_box) = 'object' AND
    bounding_box ? 'topLeft' AND
    bounding_box ? 'bottomRight' AND
    bounding_box ? 'width' AND
    bounding_box ? 'height' AND
    jsonb_typeof(bounding_box->'topLeft') = 'object' AND
    jsonb_typeof(bounding_box->'bottomRight') = 'object' AND
    (bounding_box->>'width')::numeric > 0 AND
    (bounding_box->>'height')::numeric > 0
  );

-- Add constraint to ensure bounding box coordinates are valid
ALTER TABLE annotations
  ADD CONSTRAINT check_bounding_box_coords CHECK (
    (bounding_box->'topLeft'->>'x')::numeric >= 0 AND
    (bounding_box->'topLeft'->>'y')::numeric >= 0 AND
    (bounding_box->'bottomRight'->>'x')::numeric > (bounding_box->'topLeft'->>'x')::numeric AND
    (bounding_box->'bottomRight'->>'y')::numeric > (bounding_box->'topLeft'->>'y')::numeric
  );

-- Create indexes for ai_annotation_jobs
CREATE INDEX IF NOT EXISTS idx_ai_jobs_image_id ON ai_annotation_jobs(image_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_annotation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_provider ON ai_annotation_jobs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_annotation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_created ON ai_annotation_jobs(status, created_at DESC);

-- Create indexes for annotations AI fields
CREATE INDEX IF NOT EXISTS idx_annotations_vision_generated ON annotations(vision_generated);
CREATE INDEX IF NOT EXISTS idx_annotations_review_status ON annotations(review_status);
CREATE INDEX IF NOT EXISTS idx_annotations_vision_provider ON annotations(vision_provider);
CREATE INDEX IF NOT EXISTS idx_annotations_reviewed_by ON annotations(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_annotations_ai_job_id ON annotations(ai_job_id);

-- Composite index for finding pending AI annotations
CREATE INDEX IF NOT EXISTS idx_annotations_vision_review ON annotations(vision_generated, review_status);

-- Composite index for reviewer workload queries
CREATE INDEX IF NOT EXISTS idx_annotations_review_status_created ON annotations(review_status, created_at DESC)
  WHERE vision_generated = true;

-- Create trigger to auto-update completed_at timestamp for jobs
CREATE OR REPLACE FUNCTION update_job_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_job_completed_at
  BEFORE UPDATE ON ai_annotation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_job_completed_at();

-- Create trigger to auto-update reviewed_at timestamp
CREATE OR REPLACE FUNCTION update_annotation_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.review_status IN ('approved', 'rejected') AND
     (OLD.review_status IS NULL OR OLD.review_status = 'pending') THEN
    NEW.reviewed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_annotation_reviewed_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_annotation_reviewed_at();

-- Create view for pending AI annotations needing review
CREATE OR REPLACE VIEW pending_ai_annotations AS
SELECT
  a.id,
  a.image_id,
  a.bounding_box,
  a.annotation_type,
  a.spanish_term,
  a.english_term,
  a.vision_confidence,
  a.vision_provider,
  a.created_at,
  i.url as image_url,
  i.species,
  j.request_payload,
  j.response_data
FROM annotations a
JOIN images i ON a.image_id = i.id
LEFT JOIN ai_annotation_jobs j ON a.ai_job_id = j.id
WHERE a.vision_generated = true
  AND a.review_status = 'pending'
ORDER BY a.vision_confidence ASC, a.created_at ASC;

-- Create view for AI annotation job statistics
CREATE OR REPLACE VIEW ai_job_stats AS
SELECT
  provider,
  status,
  COUNT(*) as job_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds,
  MIN(created_at) as first_job,
  MAX(created_at) as last_job
FROM ai_annotation_jobs
WHERE status IN ('completed', 'failed')
GROUP BY provider, status;

-- Create view for reviewer statistics
CREATE OR REPLACE VIEW reviewer_stats AS
SELECT
  u.id as reviewer_id,
  u.email as reviewer_email,
  COUNT(*) as total_reviews,
  SUM(CASE WHEN a.review_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
  SUM(CASE WHEN a.review_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
  AVG(EXTRACT(EPOCH FROM (a.reviewed_at - a.created_at))) as avg_review_time_seconds,
  MIN(a.reviewed_at) as first_review,
  MAX(a.reviewed_at) as last_review
FROM users u
JOIN annotations a ON u.id = a.reviewed_by
WHERE a.vision_generated = true
  AND a.review_status IN ('approved', 'rejected')
GROUP BY u.id, u.email;

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, UPDATE ON ai_annotation_jobs TO app_user;
-- GRANT SELECT, UPDATE ON annotations TO app_user;
-- GRANT SELECT ON pending_ai_annotations TO app_user;
-- GRANT SELECT ON ai_job_stats TO app_user;
-- GRANT SELECT ON reviewer_stats TO app_user;
