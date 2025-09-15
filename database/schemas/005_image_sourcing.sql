-- Image sources and attribution
CREATE TABLE image_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID REFERENCES species(id) ON DELETE CASCADE,
    source_type VARCHAR(50) CHECK (source_type IN ('unsplash', 'midjourney', 'upload')),
    source_id VARCHAR(200), -- Unsplash photo ID or other identifier
    original_url TEXT NOT NULL,
    local_path TEXT,
    thumbnail_path TEXT,
    width INTEGER,
    height INTEGER,
    photographer_name VARCHAR(200),
    photographer_url TEXT,
    license_type VARCHAR(50) DEFAULT 'unsplash',
    attribution_required BOOLEAN DEFAULT true,
    relevance_score DECIMAL(3,2), -- 0-1 score for how relevant the image is
    downloaded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Midjourney/AI prompt queue for missing images
CREATE TABLE prompt_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID REFERENCES species(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    prompt_type VARCHAR(50) DEFAULT 'midjourney', -- midjourney, dalle, etc
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'generated', 'uploaded', 'rejected', 'failed')
    ),
    generated_image_url TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(species_id, prompt_type)
);

-- API rate limit tracking
CREATE TABLE api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_name VARCHAR(50) UNIQUE NOT NULL,
    requests_made INTEGER DEFAULT 0,
    requests_limit INTEGER NOT NULL,
    reset_time TIMESTAMP WITH TIME ZONE,
    last_request_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Image import jobs for batch processing
CREATE TABLE image_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    total_species INTEGER DEFAULT 0,
    processed_species INTEGER DEFAULT 0,
    images_found INTEGER DEFAULT 0,
    images_downloaded INTEGER DEFAULT 0,
    prompts_generated INTEGER DEFAULT 0,
    error_log JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sources_species ON image_sources(species_id);
CREATE INDEX idx_sources_type ON image_sources(source_type);
CREATE INDEX idx_sources_relevance ON image_sources(relevance_score DESC);
CREATE INDEX idx_prompts_status ON prompt_queue(status);
CREATE INDEX idx_prompts_species ON prompt_queue(species_id);
CREATE INDEX idx_jobs_status ON image_import_jobs(status);

-- Initialize rate limit for Unsplash free tier
INSERT INTO api_rate_limits (api_name, requests_limit, reset_time)
VALUES ('unsplash', 50, CURRENT_TIMESTAMP + INTERVAL '1 hour')
ON CONFLICT (api_name) DO NOTHING;

-- Trigger to update updated_at
CREATE TRIGGER update_image_sources_updated_at
BEFORE UPDATE ON image_sources
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();