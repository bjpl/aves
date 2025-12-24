-- Simplified vocabulary disclosure tracking
CREATE TABLE vocabulary_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_session_id VARCHAR(100), -- Simple session tracking until auth is implemented
    annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
    spanish_term VARCHAR(200) NOT NULL,
    disclosure_level INTEGER DEFAULT 0 CHECK (disclosure_level BETWEEN 0 AND 4),
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Simple enrichment cache for vocabulary
CREATE TABLE vocabulary_enrichment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spanish_term VARCHAR(200) UNIQUE NOT NULL,
    etymology TEXT,
    mnemonic TEXT,
    related_terms JSONB, -- Array of related terms
    common_phrases JSONB, -- Array of common phrases
    usage_examples JSONB, -- Array of example sentences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_interactions_session ON vocabulary_interactions(user_session_id);
CREATE INDEX idx_interactions_annotation ON vocabulary_interactions(annotation_id);
CREATE INDEX idx_enrichment_term ON vocabulary_enrichment(spanish_term);