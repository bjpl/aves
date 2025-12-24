-- Create AI annotations table for review workflow
-- Migration: 002_create_ai_annotations_table

-- Table for AI-generated annotations awaiting review
CREATE TABLE IF NOT EXISTS ai_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(100) UNIQUE NOT NULL,
  image_id UUID NOT NULL,
  annotation_data JSONB NOT NULL, -- Array of AI-generated annotations
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  confidence_score DECIMAL(3,2), -- Overall confidence 0.00-1.00
  reviewed_by UUID, -- User ID of reviewer
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT, -- Admin notes about the review
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT ai_annotations_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'failed'))
);

-- Table for individual AI annotation items (flattened for easier querying)
CREATE TABLE IF NOT EXISTS ai_annotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(100) NOT NULL,
  image_id UUID NOT NULL,
  spanish_term VARCHAR(200) NOT NULL,
  english_term VARCHAR(200) NOT NULL,
  bounding_box JSONB NOT NULL,
  annotation_type VARCHAR(50) NOT NULL,
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  pronunciation VARCHAR(200),
  confidence DECIMAL(3,2), -- Individual annotation confidence
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, edited
  approved_annotation_id UUID, -- References annotations.id if approved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT ai_annotation_items_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'edited')),
  CONSTRAINT ai_annotation_items_type_check CHECK (annotation_type IN ('anatomical', 'behavioral', 'color', 'pattern')),
  FOREIGN KEY (job_id) REFERENCES ai_annotations(job_id) ON DELETE CASCADE
);

-- Table for tracking annotation review history
CREATE TABLE IF NOT EXISTS ai_annotation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(100) NOT NULL,
  reviewer_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- approve, reject, edit, bulk_approve, bulk_reject
  affected_items INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT ai_annotation_reviews_action_check CHECK (action IN ('approve', 'reject', 'edit', 'bulk_approve', 'bulk_reject'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_annotations_job_id ON ai_annotations(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotations_image_id ON ai_annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotations_status ON ai_annotations(status);
CREATE INDEX IF NOT EXISTS idx_ai_annotations_created_at ON ai_annotations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_job_id ON ai_annotation_items(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_image_id ON ai_annotation_items(image_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_status ON ai_annotation_items(status);

CREATE INDEX IF NOT EXISTS idx_ai_annotation_reviews_job_id ON ai_annotation_reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotation_reviews_reviewer_id ON ai_annotation_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotation_reviews_created_at ON ai_annotation_reviews(created_at DESC);

-- Trigger to auto-update updated_at timestamp for ai_annotations
CREATE TRIGGER update_ai_annotations_updated_at
  BEFORE UPDATE ON ai_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at timestamp for ai_annotation_items
CREATE TRIGGER update_ai_annotation_items_updated_at
  BEFORE UPDATE ON ai_annotation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add role column to users table for admin permissions
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'moderator'));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
