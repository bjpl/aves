-- Migration 011: Create Annotations Table
-- Created: 2025-10-16
-- Purpose: Create the main annotations table for approved AI annotations

-- ============================================================================
-- ANNOTATIONS TABLE
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_annotations_difficulty ON annotations(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_annotations_visible ON annotations(is_visible);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_annotations_updated_at
    BEFORE UPDATE ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_annotations_updated_at();

COMMENT ON TABLE annotations IS 'Production annotations table for approved AI-generated bird annotations';
COMMENT ON COLUMN annotations.bounding_box IS 'JSONB format: {topLeft: {x, y}, bottomRight: {x, y}}';
