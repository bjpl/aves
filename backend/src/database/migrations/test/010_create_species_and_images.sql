-- Test Migration 010: Create Simplified Species and Images Tables
-- Purpose: Simplified schema for fast test execution

-- ============================================================================
-- SPECIES TABLE (Simplified for testing)
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
-- IMAGES TABLE (Simplified for testing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_images_species ON images(species_id);
