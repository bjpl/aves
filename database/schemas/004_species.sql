-- Species information
CREATE TABLE species (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scientific_name VARCHAR(200) UNIQUE NOT NULL,
    spanish_name VARCHAR(200) NOT NULL,
    english_name VARCHAR(200) NOT NULL,
    order_name VARCHAR(100) NOT NULL,
    family_name VARCHAR(100) NOT NULL,
    genus VARCHAR(100) NOT NULL,
    size_category VARCHAR(20) CHECK (size_category IN ('small', 'medium', 'large')),
    primary_colors TEXT[], -- Array of main colors
    habitats TEXT[], -- Array of habitat types
    conservation_status VARCHAR(20),
    description_spanish TEXT,
    description_english TEXT,
    fun_fact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Species images mapping
CREATE TABLE species_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID REFERENCES species(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(species_id, image_id)
);

-- Link existing images table to species
ALTER TABLE images ADD COLUMN IF NOT EXISTS species_id UUID REFERENCES species(id);

-- Indexes for filtering and searching
CREATE INDEX idx_species_order ON species(order_name);
CREATE INDEX idx_species_family ON species(family_name);
CREATE INDEX idx_species_genus ON species(genus);
CREATE INDEX idx_species_size ON species(size_category);
CREATE INDEX idx_species_spanish ON species(spanish_name);
CREATE INDEX idx_species_english ON species(english_name);
CREATE INDEX idx_species_scientific ON species(scientific_name);
CREATE INDEX idx_species_conservation ON species(conservation_status);

-- Full text search index
CREATE INDEX idx_species_search ON species USING gin(
    to_tsvector('spanish', spanish_name || ' ' || coalesce(description_spanish, ''))
);

-- Trigger to update updated_at
CREATE TRIGGER update_species_updated_at
BEFORE UPDATE ON species
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for common Spanish birds
INSERT INTO species (
    scientific_name, spanish_name, english_name,
    order_name, family_name, genus,
    size_category, primary_colors, habitats
) VALUES
    ('Aquila chrysaetos', 'Águila real', 'Golden Eagle',
     'Accipitriformes', 'Accipitridae', 'Aquila',
     'large', ARRAY['brown', 'gold'], ARRAY['mountain', 'forest']),

    ('Ciconia ciconia', 'Cigüeña blanca', 'White Stork',
     'Ciconiiformes', 'Ciconiidae', 'Ciconia',
     'large', ARRAY['white', 'black'], ARRAY['wetland', 'urban']),

    ('Passer domesticus', 'Gorrión común', 'House Sparrow',
     'Passeriformes', 'Passeridae', 'Passer',
     'small', ARRAY['brown', 'gray'], ARRAY['urban', 'agricultural']),

    ('Erithacus rubecula', 'Petirrojo europeo', 'European Robin',
     'Passeriformes', 'Muscicapidae', 'Erithacus',
     'small', ARRAY['brown', 'red'], ARRAY['forest', 'garden']),

    ('Pica pica', 'Urraca común', 'Eurasian Magpie',
     'Passeriformes', 'Corvidae', 'Pica',
     'medium', ARRAY['black', 'white'], ARRAY['urban', 'forest'])
ON CONFLICT (scientific_name) DO NOTHING;