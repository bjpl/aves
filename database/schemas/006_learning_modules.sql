-- Migration 006: Learning Modules and Content Publishing
-- SPARC Specification: Database schema for learning content pipeline

-- ============================================
-- Learning Modules Table
-- ============================================

CREATE TABLE learning_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content
  title VARCHAR(200) NOT NULL,
  title_spanish VARCHAR(200) NOT NULL,
  description TEXT,
  description_spanish TEXT,

  -- Organization
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  species_ids UUID[] NOT NULL,
  prerequisite_module_id UUID REFERENCES learning_modules(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Publishing
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_module_title UNIQUE(title),
  CONSTRAINT unique_module_title_spanish UNIQUE(title_spanish),
  CONSTRAINT valid_order_index CHECK (order_index >= 0)
);

-- ============================================
-- Extend Annotations Table
-- ============================================

ALTER TABLE annotations
  ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN learning_module_id UUID REFERENCES learning_modules(id) ON DELETE SET NULL;

-- Only approved annotations can be published
ALTER TABLE annotations
  ADD CONSTRAINT published_must_be_approved
  CHECK (
    (published_at IS NULL) OR
    (published_at IS NOT NULL AND status = 'approved')
  );

-- ============================================
-- Indexes for Performance
-- ============================================

-- Learning modules indexes
CREATE INDEX idx_modules_difficulty ON learning_modules(difficulty_level);
CREATE INDEX idx_modules_published ON learning_modules(is_published) WHERE is_published = true;
CREATE INDEX idx_modules_order ON learning_modules(order_index);
CREATE INDEX idx_modules_species ON learning_modules USING GIN(species_ids);
CREATE INDEX idx_modules_prerequisite ON learning_modules(prerequisite_module_id);

-- Annotations indexes for content queries
CREATE INDEX idx_annotations_published ON annotations(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_annotations_module ON annotations(learning_module_id) WHERE learning_module_id IS NOT NULL;
CREATE INDEX idx_annotations_published_difficulty ON annotations(difficulty_level, published_at) WHERE published_at IS NOT NULL;

-- Composite index for common query pattern
CREATE INDEX idx_annotations_module_published ON annotations(learning_module_id, published_at) WHERE published_at IS NOT NULL;

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_learning_modules_updated_at
BEFORE UPDATE ON learning_modules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-set published_at when is_published changes to true
CREATE OR REPLACE FUNCTION set_module_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = true AND OLD.is_published = false THEN
    NEW.published_at = CURRENT_TIMESTAMP;
  ELSIF NEW.is_published = false THEN
    NEW.published_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_module_published_at
BEFORE UPDATE ON learning_modules
FOR EACH ROW
EXECUTE FUNCTION set_module_published_at();

-- ============================================
-- Validation Functions
-- ============================================

-- Prevent circular prerequisite dependencies
CREATE OR REPLACE FUNCTION check_prerequisite_cycle()
RETURNS TRIGGER AS $$
DECLARE
  visited UUID[];
  current_id UUID;
BEGIN
  -- Skip if no prerequisite
  IF NEW.prerequisite_module_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if prerequisite creates a cycle
  visited := ARRAY[NEW.id];
  current_id := NEW.prerequisite_module_id;

  WHILE current_id IS NOT NULL LOOP
    -- Cycle detected
    IF current_id = ANY(visited) THEN
      RAISE EXCEPTION 'Circular prerequisite dependency detected';
    END IF;

    -- Add to visited
    visited := array_append(visited, current_id);

    -- Get next prerequisite
    SELECT prerequisite_module_id INTO current_id
    FROM learning_modules
    WHERE id = current_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_module_prerequisite_cycle
BEFORE INSERT OR UPDATE ON learning_modules
FOR EACH ROW
EXECUTE FUNCTION check_prerequisite_cycle();

-- ============================================
-- Useful Views
-- ============================================

-- View: Modules with annotation counts
CREATE OR REPLACE VIEW module_stats AS
SELECT
  m.id,
  m.title,
  m.title_spanish,
  m.difficulty_level,
  m.is_published,
  m.published_at,
  COUNT(a.id) as annotation_count,
  COUNT(a.id) FILTER (WHERE a.published_at IS NOT NULL) as published_annotation_count,
  array_length(m.species_ids, 1) as species_count
FROM learning_modules m
LEFT JOIN annotations a ON a.learning_module_id = m.id
GROUP BY m.id;

-- View: Published content summary
CREATE OR REPLACE VIEW published_content_summary AS
SELECT
  COUNT(DISTINCT id) as total_annotations,
  COUNT(DISTINCT learning_module_id) as total_modules,
  COUNT(DISTINCT image_id) as total_images,
  MIN(published_at) as first_published,
  MAX(published_at) as last_published,
  AVG(difficulty_level) as avg_difficulty
FROM annotations
WHERE published_at IS NOT NULL;

-- ============================================
-- Sample Data (Optional for Development)
-- ============================================

-- Uncomment to insert sample modules for testing
/*
INSERT INTO learning_modules (title, title_spanish, description, description_spanish, difficulty_level, species_ids, order_index)
VALUES
  ('Bird Anatomy Basics', 'Anatomía Básica de Aves', 'Learn fundamental bird anatomy terms', 'Aprende términos fundamentales de anatomía de aves', 1, '{}', 1),
  ('Colors and Patterns', 'Colores y Patrones', 'Identify bird colors and patterns', 'Identifica colores y patrones de aves', 2, '{}', 2),
  ('Bird Behavior', 'Comportamiento de Aves', 'Understand bird behaviors', 'Comprende comportamientos de aves', 3, '{}', 3);
*/

-- ============================================
-- Rollback (if needed)
-- ============================================

-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS check_module_prerequisite_cycle ON learning_modules;
-- DROP FUNCTION IF EXISTS check_prerequisite_cycle();
-- DROP TRIGGER IF EXISTS trigger_set_module_published_at ON learning_modules;
-- DROP FUNCTION IF EXISTS set_module_published_at();
-- DROP VIEW IF EXISTS published_content_summary;
-- DROP VIEW IF EXISTS module_stats;
-- ALTER TABLE annotations DROP CONSTRAINT IF EXISTS published_must_be_approved;
-- ALTER TABLE annotations DROP COLUMN IF EXISTS learning_module_id;
-- ALTER TABLE annotations DROP COLUMN IF EXISTS published_at;
-- DROP TABLE IF EXISTS learning_modules CASCADE;
