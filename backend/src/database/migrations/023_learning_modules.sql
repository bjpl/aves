-- Learning modules for structured content organization
CREATE TABLE IF NOT EXISTS learning_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  title_spanish VARCHAR(200) NOT NULL,
  description TEXT,
  description_spanish TEXT,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 1,
  species_ids UUID[],
  prerequisite_module_id UUID REFERENCES learning_modules(id),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add published_at to annotations for content pipeline
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS learning_module_id UUID REFERENCES learning_modules(id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_annotations_published ON annotations(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_annotations_module ON annotations(learning_module_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_active ON learning_modules(is_active) WHERE is_active = true;
