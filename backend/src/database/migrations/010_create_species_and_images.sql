-- Migration 010: Create Species and Images Tables
-- Created: 2025-10-05
-- Purpose: Store bird species metadata and Unsplash image references

-- ============================================================================
-- SPECIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Taxonomy
  scientific_name VARCHAR(255) UNIQUE NOT NULL,
  english_name VARCHAR(255) NOT NULL,
  spanish_name VARCHAR(255) NOT NULL,
  order_name VARCHAR(100) NOT NULL,
  family_name VARCHAR(100) NOT NULL,
  genus VARCHAR(100),

  -- Characteristics
  habitats TEXT[] DEFAULT '{}',
  size_category VARCHAR(20) CHECK (size_category IN ('small', 'medium', 'large')),
  primary_colors TEXT[] DEFAULT '{}',
  conservation_status VARCHAR(10) DEFAULT 'LC',

  -- Descriptions
  description_spanish TEXT,
  description_english TEXT,
  fun_fact TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for species table
CREATE INDEX IF NOT EXISTS idx_species_english_name ON species(english_name);
CREATE INDEX IF NOT EXISTS idx_species_spanish_name ON species(spanish_name);
CREATE INDEX IF NOT EXISTS idx_species_scientific_name ON species(scientific_name);
CREATE INDEX IF NOT EXISTS idx_species_family ON species(family_name);
CREATE INDEX IF NOT EXISTS idx_species_order ON species(order_name);
CREATE INDEX IF NOT EXISTS idx_species_conservation ON species(conservation_status);

-- GIN index for array searches
CREATE INDEX IF NOT EXISTS idx_species_habitats ON species USING GIN(habitats);
CREATE INDEX IF NOT EXISTS idx_species_colors ON species USING GIN(primary_colors);

COMMENT ON TABLE species IS 'Bird species taxonomy and metadata for the Aves learning platform';
COMMENT ON COLUMN species.conservation_status IS 'IUCN Red List status: LC, NT, VU, EN, CR, EW, EX';

-- ============================================================================
-- IMAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,

  -- Unsplash data
  unsplash_id VARCHAR(50) UNIQUE NOT NULL,
  url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color VARCHAR(20),
  description TEXT,

  -- Attribution
  photographer VARCHAR(255),
  photographer_username VARCHAR(255),
  download_location TEXT,

  -- Usage tracking
  view_count INTEGER DEFAULT 0,
  annotation_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for images table
CREATE INDEX IF NOT EXISTS idx_images_species ON images(species_id);
CREATE INDEX IF NOT EXISTS idx_images_unsplash_id ON images(unsplash_id);
CREATE INDEX IF NOT EXISTS idx_images_annotation_count ON images(annotation_count DESC);

COMMENT ON TABLE images IS 'Unsplash bird images with metadata and attribution';
COMMENT ON COLUMN images.annotation_count IS 'Number of AI annotations generated for this image';

-- ============================================================================
-- UPDATE FUNCTIONS
-- ============================================================================

-- Function to update annotation count when annotations are created
CREATE OR REPLACE FUNCTION update_image_annotation_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: image_id in ai_annotation_items is text, id in images is uuid
  UPDATE images
  SET annotation_count = (
    SELECT COUNT(*)
    FROM ai_annotation_items
    WHERE image_id = NEW.image_id
  )
  WHERE id::text = NEW.image_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update annotation count
CREATE TRIGGER trigger_update_annotation_count
  AFTER INSERT OR DELETE ON ai_annotation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_image_annotation_count();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for species with image counts
CREATE OR REPLACE VIEW species_with_images AS
SELECT
  s.*,
  COUNT(i.id) as image_count,
  SUM(i.annotation_count) as total_annotations
FROM species s
LEFT JOIN images i ON s.id = i.species_id
GROUP BY s.id;

COMMENT ON VIEW species_with_images IS 'Species enriched with image and annotation counts';

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get all species with images:
-- SELECT * FROM species_with_images ORDER BY image_count DESC;

-- Get images for a specific species:
-- SELECT * FROM images WHERE species_id = 'some-uuid' ORDER BY annotation_count DESC;

-- Get species by habitat:
-- SELECT * FROM species WHERE 'forest' = ANY(habitats);

-- Get species by color:
-- SELECT * FROM species WHERE 'red' = ANY(primary_colors);
