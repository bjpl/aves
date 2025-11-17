-- Migration: Reinforcement Learning Feedback Data Storage
-- Description: Creates tables to store annotation corrections, rejection patterns,
--              positioning models, and feedback metrics for ML model improvement
-- Created: 2025-11-17

-- ============================================================================
-- 1. ANNOTATION CORRECTIONS TABLE
-- ============================================================================
-- Stores user corrections to AI-generated annotations for reinforcement learning

CREATE TABLE IF NOT EXISTS annotation_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES ai_annotation_items(id) ON DELETE CASCADE,
  original_bounding_box JSONB NOT NULL,
  corrected_bounding_box JSONB NOT NULL,
  delta_x DECIMAL(5,4) NOT NULL,  -- Changed from (3,2) to (5,4) for more precision
  delta_y DECIMAL(5,4) NOT NULL,
  delta_width DECIMAL(5,4) NOT NULL,
  delta_height DECIMAL(5,4) NOT NULL,
  species TEXT,
  feature_type TEXT,
  corrected_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_delta_x CHECK (delta_x BETWEEN -1.0 AND 1.0),
  CONSTRAINT valid_delta_y CHECK (delta_y BETWEEN -1.0 AND 1.0),
  CONSTRAINT valid_delta_width CHECK (delta_width BETWEEN -1.0 AND 1.0),
  CONSTRAINT valid_delta_height CHECK (delta_height BETWEEN -1.0 AND 1.0)
);

-- Indexes for annotation_corrections
CREATE INDEX IF NOT EXISTS idx_corrections_annotation
  ON annotation_corrections(annotation_id);

CREATE INDEX IF NOT EXISTS idx_corrections_species
  ON annotation_corrections(species)
  WHERE species IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_corrections_feature
  ON annotation_corrections(feature_type)
  WHERE feature_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_corrections_species_feature
  ON annotation_corrections(species, feature_type)
  WHERE species IS NOT NULL AND feature_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_corrections_created
  ON annotation_corrections(created_at DESC);

-- ============================================================================
-- 2. REJECTION PATTERNS TABLE
-- ============================================================================
-- Stores patterns of rejected annotations to identify systematic ML errors

CREATE TABLE IF NOT EXISTS rejection_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES ai_annotation_items(id) ON DELETE SET NULL,
  rejection_category TEXT NOT NULL,
  rejection_notes TEXT,
  species TEXT,
  feature_type TEXT,
  bounding_box JSONB,
  confidence_score DECIMAL(5,4),
  rejected_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_rejection_category CHECK (
    rejection_category IN (
      'incorrect_species',
      'incorrect_feature',
      'poor_localization',
      'false_positive',
      'duplicate',
      'low_quality',
      'other'
    )
  ),
  CONSTRAINT valid_confidence CHECK (
    confidence_score IS NULL OR
    (confidence_score >= 0.0 AND confidence_score <= 1.0)
  )
);

-- Indexes for rejection_patterns
CREATE INDEX IF NOT EXISTS idx_rejection_category
  ON rejection_patterns(rejection_category);

CREATE INDEX IF NOT EXISTS idx_rejection_species
  ON rejection_patterns(species)
  WHERE species IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rejection_feature
  ON rejection_patterns(feature_type)
  WHERE feature_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rejection_confidence
  ON rejection_patterns(confidence_score)
  WHERE confidence_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rejection_created
  ON rejection_patterns(created_at DESC);

-- ============================================================================
-- 3. POSITIONING MODEL TABLE
-- ============================================================================
-- Stores learned positioning adjustments per species/feature combination

CREATE TABLE IF NOT EXISTS positioning_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species TEXT NOT NULL,
  feature_type TEXT NOT NULL,
  avg_delta_x DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  avg_delta_y DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  avg_delta_width DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  avg_delta_height DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  std_dev_x DECIMAL(5,4) DEFAULT 0.0,  -- Standard deviation for confidence calculation
  std_dev_y DECIMAL(5,4) DEFAULT 0.0,
  std_dev_width DECIMAL(5,4) DEFAULT 0.0,
  std_dev_height DECIMAL(5,4) DEFAULT 0.0,
  sample_count INTEGER DEFAULT 0 NOT NULL,
  confidence DECIMAL(5,4) DEFAULT 0.0,
  last_trained TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_species_feature UNIQUE(species, feature_type),
  CONSTRAINT valid_sample_count CHECK (sample_count >= 0),
  CONSTRAINT valid_confidence CHECK (confidence BETWEEN 0.0 AND 1.0),
  CONSTRAINT valid_avg_delta_x CHECK (avg_delta_x BETWEEN -1.0 AND 1.0),
  CONSTRAINT valid_avg_delta_y CHECK (avg_delta_y BETWEEN -1.0 AND 1.0),
  CONSTRAINT valid_avg_delta_width CHECK (avg_delta_width BETWEEN -1.0 AND 1.0),
  CONSTRAINT valid_avg_delta_height CHECK (avg_delta_height BETWEEN -1.0 AND 1.0)
);

-- Indexes for positioning_model
CREATE INDEX IF NOT EXISTS idx_positioning_species
  ON positioning_model(species);

CREATE INDEX IF NOT EXISTS idx_positioning_feature
  ON positioning_model(feature_type);

CREATE INDEX IF NOT EXISTS idx_positioning_confidence
  ON positioning_model(confidence DESC);

CREATE INDEX IF NOT EXISTS idx_positioning_last_trained
  ON positioning_model(last_trained DESC);

-- ============================================================================
-- 4. FEEDBACK METRICS TABLE
-- ============================================================================
-- Stores aggregated feedback metrics for monitoring ML performance over time

CREATE TABLE IF NOT EXISTS feedback_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  species TEXT,
  feature_type TEXT,
  value DECIMAL(7,4) NOT NULL,  -- Changed from (5,2) to (7,4) for more precision
  sample_size INTEGER NOT NULL DEFAULT 0,
  time_window TEXT,  -- e.g., '1day', '7days', '30days', 'all_time'
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_metric_type CHECK (
    metric_type IN (
      'approval_rate',
      'rejection_rate',
      'correction_rate',
      'avg_confidence',
      'avg_correction_magnitude',
      'false_positive_rate',
      'precision',
      'recall'
    )
  ),
  CONSTRAINT valid_sample_size CHECK (sample_size >= 0),
  CONSTRAINT valid_metric_value CHECK (value >= 0.0)
);

-- Indexes for feedback_metrics
CREATE INDEX IF NOT EXISTS idx_metrics_type
  ON feedback_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_metrics_species
  ON feedback_metrics(species)
  WHERE species IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_metrics_feature
  ON feedback_metrics(feature_type)
  WHERE feature_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_metrics_calculated
  ON feedback_metrics(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_type_species_feature
  ON feedback_metrics(metric_type, species, feature_type)
  WHERE species IS NOT NULL AND feature_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_metrics_time_window
  ON feedback_metrics(time_window)
  WHERE time_window IS NOT NULL;

-- ============================================================================
-- 5. HELPER VIEWS
-- ============================================================================

-- View: Recent corrections summary
CREATE OR REPLACE VIEW recent_corrections_summary AS
SELECT
  species,
  feature_type,
  COUNT(*) as correction_count,
  AVG(delta_x) as avg_x_correction,
  AVG(delta_y) as avg_y_correction,
  AVG(delta_width) as avg_width_correction,
  AVG(delta_height) as avg_height_correction,
  MAX(created_at) as last_correction
FROM annotation_corrections
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY species, feature_type
ORDER BY correction_count DESC;

-- View: Rejection analysis
CREATE OR REPLACE VIEW rejection_analysis AS
SELECT
  rejection_category,
  species,
  feature_type,
  COUNT(*) as rejection_count,
  AVG(confidence_score) as avg_confidence_of_rejected,
  MAX(created_at) as last_rejection
FROM rejection_patterns
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY rejection_category, species, feature_type
ORDER BY rejection_count DESC;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE annotation_corrections IS
  'Stores user corrections to AI annotations for reinforcement learning';

COMMENT ON TABLE rejection_patterns IS
  'Tracks rejected annotations to identify systematic ML model errors';

COMMENT ON TABLE positioning_model IS
  'Learned positioning adjustments per species and feature type combination';

COMMENT ON TABLE feedback_metrics IS
  'Aggregated metrics tracking ML model performance over time';

COMMENT ON COLUMN annotation_corrections.delta_x IS
  'Normalized horizontal position correction (-1.0 to 1.0)';

COMMENT ON COLUMN annotation_corrections.delta_y IS
  'Normalized vertical position correction (-1.0 to 1.0)';

COMMENT ON COLUMN positioning_model.confidence IS
  'Model confidence based on sample size and consistency (0.0 to 1.0)';

COMMENT ON COLUMN feedback_metrics.time_window IS
  'Time period for metric aggregation (1day, 7days, 30days, all_time)';

-- ============================================================================
-- 7. GRANT PERMISSIONS (adjust as needed for your user roles)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE ON annotation_corrections TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON rejection_patterns TO app_user;
-- GRANT SELECT, UPDATE ON positioning_model TO app_user;
-- GRANT SELECT, INSERT ON feedback_metrics TO app_user;
