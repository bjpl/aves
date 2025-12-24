-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Images table
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    species VARCHAR(200) NOT NULL,
    scientific_name VARCHAR(200) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('unsplash', 'midjourney', 'uploaded')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    photographer VARCHAR(200),
    license VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Annotations table
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Annotation interactions table for analytics
CREATE TABLE annotation_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    user_id UUID,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('hover', 'click', 'keyboard')),
    revealed BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_images_species ON images(species);
CREATE INDEX idx_images_source ON images(source);
CREATE INDEX idx_annotations_image_id ON annotations(image_id);
CREATE INDEX idx_annotations_type ON annotations(annotation_type);
CREATE INDEX idx_annotations_difficulty ON annotations(difficulty_level);
CREATE INDEX idx_interactions_annotation ON annotation_interactions(annotation_id);
CREATE INDEX idx_interactions_user ON annotation_interactions(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();