-- Migration: Batch job tracking tables
-- Description: Add tables for tracking batch annotation generation jobs

-- Batch jobs table
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL DEFAULT 'annotation_generation',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  successful_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch job errors table
CREATE TABLE IF NOT EXISTS batch_job_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  item_id VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_job_errors_job_id ON batch_job_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_batch_job_errors_item_id ON batch_job_errors(item_id);

-- Comments
COMMENT ON TABLE batch_jobs IS 'Tracks batch processing jobs for AI annotation generation';
COMMENT ON TABLE batch_job_errors IS 'Stores errors encountered during batch processing';

COMMENT ON COLUMN batch_jobs.job_type IS 'Type of batch job (e.g., annotation_generation)';
COMMENT ON COLUMN batch_jobs.status IS 'Current status: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN batch_jobs.metadata IS 'Job configuration and parameters (imageIds, concurrency, etc.)';
COMMENT ON COLUMN batch_job_errors.attempt_number IS 'Retry attempt number (1-3)';
