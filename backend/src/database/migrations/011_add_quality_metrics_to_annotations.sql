-- Migration: Add Quality Metrics to AI Annotation Items
-- Description: Adds columns for image quality assessment and bird detection metrics

-- Add quality metric columns to ai_annotation_items table
ALTER TABLE ai_annotation_items
ADD COLUMN IF NOT EXISTS quality_score INTEGER,
ADD COLUMN IF NOT EXISTS bird_detected BOOLEAN,
ADD COLUMN IF NOT EXISTS bird_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS bird_size_percentage DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS image_clarity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS image_lighting DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS image_focus DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN ai_annotation_items.quality_score IS 'Overall image quality score (0-100) calculated from clarity, lighting, focus, and bird size';
COMMENT ON COLUMN ai_annotation_items.bird_detected IS 'Whether a bird was detected in the image';
COMMENT ON COLUMN ai_annotation_items.bird_confidence IS 'Confidence level of bird detection (0.0-1.0)';
COMMENT ON COLUMN ai_annotation_items.bird_size_percentage IS 'Percentage of image occupied by the bird (0.0-1.0)';
COMMENT ON COLUMN ai_annotation_items.image_clarity IS 'Image clarity/sharpness score (0.0-1.0)';
COMMENT ON COLUMN ai_annotation_items.image_lighting IS 'Image lighting quality score (0.0-1.0)';
COMMENT ON COLUMN ai_annotation_items.image_focus IS 'Image focus quality score (0.0-1.0)';
COMMENT ON COLUMN ai_annotation_items.skip_reason IS 'Reason why annotation was skipped (if applicable)';

-- Create index on quality_score for filtering high-quality annotations
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_quality_score
ON ai_annotation_items(quality_score)
WHERE quality_score IS NOT NULL;

-- Create index on bird_detected for filtering validated images
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_bird_detected
ON ai_annotation_items(bird_detected)
WHERE bird_detected = true;

-- Add check constraint to ensure valid score ranges
ALTER TABLE ai_annotation_items
ADD CONSTRAINT check_quality_score_range
CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));

ALTER TABLE ai_annotation_items
ADD CONSTRAINT check_bird_confidence_range
CHECK (bird_confidence IS NULL OR (bird_confidence >= 0 AND bird_confidence <= 1));

ALTER TABLE ai_annotation_items
ADD CONSTRAINT check_bird_size_range
CHECK (bird_size_percentage IS NULL OR (bird_size_percentage >= 0 AND bird_size_percentage <= 1));

ALTER TABLE ai_annotation_items
ADD CONSTRAINT check_clarity_range
CHECK (image_clarity IS NULL OR (image_clarity >= 0 AND image_clarity <= 1));

ALTER TABLE ai_annotation_items
ADD CONSTRAINT check_lighting_range
CHECK (image_lighting IS NULL OR (image_lighting >= 0 AND image_lighting <= 1));

ALTER TABLE ai_annotation_items
ADD CONSTRAINT check_focus_range
CHECK (image_focus IS NULL OR (image_focus >= 0 AND image_focus <= 1));
