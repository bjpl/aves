-- ============================================================================
-- COMPREHENSIVE TEST SCHEMA MIGRATION
-- ============================================================================
-- Purpose: Create all required tables for integration testing
-- Target Schema: aves_test (isolated from production)
-- Created: 2025-10-17
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'moderator'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- 2. SPECIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_species_name ON species(name);
CREATE INDEX IF NOT EXISTS idx_species_scientific_name ON species(scientific_name);

-- ============================================================================
-- 3. IMAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_images_species ON images(species_id);

-- ============================================================================
-- 4. VOCABULARY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  spanish_term VARCHAR(200) NOT NULL,
  english_term VARCHAR(200) NOT NULL,
  pronunciation VARCHAR(200),
  difficulty_level INTEGER NOT NULL DEFAULT 2 CHECK (difficulty_level BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_species ON vocabulary(species_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_difficulty ON vocabulary(difficulty_level);

-- ============================================================================
-- 5. ANNOTATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  bounding_box JSONB NOT NULL,
  annotation_type VARCHAR(50) NOT NULL CHECK (annotation_type IN ('anatomical', 'behavioral', 'color', 'pattern')),
  spanish_term VARCHAR(200) NOT NULL,
  english_term VARCHAR(200) NOT NULL,
  pronunciation VARCHAR(200),
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_annotations_difficulty ON annotations(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_annotations_visible ON annotations(is_visible);

-- ============================================================================
-- 6. AI ANNOTATIONS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(100) UNIQUE NOT NULL,
  image_id UUID NOT NULL,
  annotation_data JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  confidence_score DECIMAL(3,2),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_annotations_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'failed'))
);

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
  confidence DECIMAL(3,2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_annotation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_annotation_items_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'edited')),
  CONSTRAINT ai_annotation_items_type_check CHECK (annotation_type IN ('anatomical', 'behavioral', 'color', 'pattern')),
  FOREIGN KEY (job_id) REFERENCES ai_annotations(job_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_annotation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(100) NOT NULL,
  reviewer_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  affected_items INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_annotation_reviews_action_check CHECK (action IN ('approve', 'reject', 'edit', 'bulk_approve', 'bulk_reject'))
);

CREATE INDEX IF NOT EXISTS idx_ai_annotations_job_id ON ai_annotations(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotations_image_id ON ai_annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotations_status ON ai_annotations(status);
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_job_id ON ai_annotation_items(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_status ON ai_annotation_items(status);
CREATE INDEX IF NOT EXISTS idx_ai_annotation_reviews_job_id ON ai_annotation_reviews(job_id);

-- ============================================================================
-- 7. BATCH JOBS TABLE (CRITICAL - Was missing!)
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS batch_job_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  item_id VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_job_errors_job_id ON batch_job_errors(job_id);

-- ============================================================================
-- 8. EXERCISE CACHE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS exercise_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  exercise_type VARCHAR(50) NOT NULL,
  exercise_data JSONB NOT NULL,
  user_context_hash VARCHAR(64) NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  topics TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  generation_cost DECIMAL(10, 6) DEFAULT 0.003,
  generation_time_ms INTEGER,
  CONSTRAINT check_expires_at CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_cache_key ON exercise_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_exercise_type_difficulty ON exercise_cache(exercise_type, difficulty);
CREATE INDEX IF NOT EXISTS idx_exercise_expires_at ON exercise_cache(expires_at);

-- ============================================================================
-- 9. USER PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species_id UUID REFERENCES species(id) ON DELETE CASCADE,
  vocabulary_id UUID REFERENCES vocabulary(id) ON DELETE CASCADE,
  exercise_type VARCHAR(50),
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  correct_answers INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_species ON user_progress(species_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_vocabulary ON user_progress(vocabulary_id);

-- ============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_updated_at
  BEFORE UPDATE ON vocabulary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_annotations_updated_at
  BEFORE UPDATE ON ai_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_annotation_items_updated_at
  BEFORE UPDATE ON ai_annotation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_jobs_updated_at
  BEFORE UPDATE ON batch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE batch_jobs IS 'Test schema: Tracks batch processing jobs for AI annotation generation';
COMMENT ON TABLE batch_job_errors IS 'Test schema: Stores errors encountered during batch processing';
COMMENT ON TABLE exercise_cache IS 'Test schema: Caches AI-generated exercises to reduce API costs';
COMMENT ON TABLE user_progress IS 'Test schema: Tracks user learning progress and statistics';
COMMENT ON TABLE vocabulary IS 'Test schema: Spanish-English vocabulary terms for bird-related learning';
COMMENT ON TABLE ai_annotations IS 'Test schema: AI-generated annotations awaiting review';
COMMENT ON TABLE ai_annotation_items IS 'Test schema: Individual AI annotation items for granular review';
COMMENT ON TABLE ai_annotation_reviews IS 'Test schema: Audit trail for annotation review actions';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables created successfully in test schema
-- Ready for integration testing
-- ============================================================================
