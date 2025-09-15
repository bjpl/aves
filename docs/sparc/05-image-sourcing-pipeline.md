# SPARC Development: Image Sourcing Pipeline

## 📋 SPECIFICATION

### Purpose
Create a robust image sourcing pipeline that integrates Unsplash API for high-quality bird photography, with intelligent caching and a prompt generation system for coverage gaps, ensuring comprehensive visual content for all species.

### Requirements
1. **Functional Requirements**
   - Search Unsplash API for bird images by species name
   - Cache downloaded images locally
   - Generate Midjourney prompts for missing species
   - Track image attribution and licensing
   - Batch import capabilities
   - Quality filtering (minimum resolution, relevance)
   - Duplicate detection

2. **Non-Functional Requirements**
   - Rate limit compliance (50 requests/hour for free tier)
   - Image optimization for web delivery
   - Fallback to placeholder images
   - Attribution tracking for legal compliance

### Image Pipeline Stages
1. **Search**: Query Unsplash with species names (scientific/common)
2. **Filter**: Apply quality and relevance filters
3. **Download**: Fetch and store selected images
4. **Process**: Resize, optimize, generate thumbnails
5. **Catalog**: Store metadata and attribution
6. **Fallback**: Generate prompts for missing coverage

## 🔤 PSEUDOCODE

```
CLASS ImageSourcingPipeline:
    unsplashClient = null
    imageCache = Map<speciesId, Image[]>
    rateLimiter = { remaining: 50, resetTime: null }

    FUNCTION searchImages(species):
        // Try multiple search strategies
        searchQueries = [
            species.scientificName,
            species.englishName + " bird",
            species.spanishName + " ave"
        ]

        results = []
        FOR EACH query IN searchQueries:
            IF rateLimiter.remaining > 0:
                images = unsplashClient.search(query)
                rateLimiter.remaining--

                filteredImages = images.filter(img =>
                    img.width >= 1200 AND
                    img.height >= 800 AND
                    hasRelevantTags(img.tags, species)
                )

                results.push(...filteredImages)

                IF results.length >= 5:
                    BREAK

        RETURN results

    FUNCTION processImage(imageUrl, species):
        // Download original
        imageData = downloadImage(imageUrl)

        // Generate variations
        thumbnail = resizeImage(imageData, 400, 300)
        webOptimized = optimizeImage(imageData, 1200, 900)

        // Store with attribution
        savedImage = {
            speciesId: species.id,
            originalUrl: imageUrl,
            localPath: saveToStorage(webOptimized),
            thumbnailPath: saveToStorage(thumbnail),
            attribution: extractAttribution(imageUrl),
            downloadedAt: NOW()
        }

        RETURN savedImage

    FUNCTION generateMidjourneyPrompt(species):
        basePrompt = "naturalistic bird photography, "

        // Add species characteristics
        prompt = basePrompt + species.englishName + ", "

        // Add visual details
        IF species.primaryColors:
            prompt += species.primaryColors.join(", ") + " plumage, "

        // Add habitat context
        IF species.habitats:
            prompt += "in " + species.habitats[0] + " habitat, "

        // Add technical specs
        prompt += "professional wildlife photography, sharp focus, "
        prompt += "natural lighting, high detail, 4k quality"

        RETURN {
            speciesId: species.id,
            prompt: prompt,
            status: "pending",
            createdAt: NOW()
        }

    FUNCTION syncSpeciesImages():
        allSpecies = fetchAllSpecies()
        needsImages = []

        FOR EACH species IN allSpecies:
            existingImages = getImagesForSpecies(species.id)

            IF existingImages.length < 3:
                needsImages.push(species)

        // Process in batches to respect rate limits
        FOR EACH batch IN chunks(needsImages, 10):
            FOR EACH species IN batch:
                images = searchImages(species)

                IF images.length > 0:
                    FOR EACH image IN images.slice(0, 3):
                        processImage(image.url, species)
                ELSE:
                    // Generate prompt for manual sourcing
                    generateMidjourneyPrompt(species)

            // Wait for rate limit reset if needed
            IF rateLimiter.remaining < 5:
                WAIT_UNTIL(rateLimiter.resetTime)
```

## 🏗️ ARCHITECTURE

### Component Structure
```
ImageSourcing/
├── components/
│   ├── ImageImporter.tsx          # Batch import interface
│   ├── ImageSearch.tsx            # Manual search tool
│   ├── PromptGenerator.tsx        # Midjourney prompt UI
│   └── AttributionDisplay.tsx     # License info display
├── services/
│   ├── unsplashService.ts         # Unsplash API wrapper
│   ├── imageProcessor.ts          # Image optimization
│   ├── promptGenerator.ts         # Prompt creation logic
│   └── rateLimiter.ts            # Rate limit management
├── workers/
│   └── imageSyncWorker.ts        # Background sync process
└── types/
    └── image.types.ts             # TypeScript definitions
```

### Data Model
```sql
-- Image sources and attribution
CREATE TABLE image_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID REFERENCES species(id),
    source_type VARCHAR(50) CHECK (source_type IN ('unsplash', 'midjourney', 'upload')),
    source_id VARCHAR(200), -- Unsplash photo ID or other identifier
    original_url TEXT,
    local_path TEXT,
    thumbnail_path TEXT,
    width INTEGER,
    height INTEGER,
    photographer_name VARCHAR(200),
    photographer_url TEXT,
    license_type VARCHAR(50),
    attribution_required BOOLEAN DEFAULT true,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Midjourney prompt queue
CREATE TABLE prompt_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID REFERENCES species(id),
    prompt TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'uploaded', 'rejected')),
    generated_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Rate limit tracking
CREATE TABLE api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_name VARCHAR(50) UNIQUE NOT NULL,
    requests_made INTEGER DEFAULT 0,
    requests_limit INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE,
    last_request_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sources_species ON image_sources(species_id);
CREATE INDEX idx_sources_type ON image_sources(source_type);
CREATE INDEX idx_prompts_status ON prompt_queue(status);
```

## 🔧 REFINEMENT

### Optimization Strategies
1. **Performance**
   - Lazy load images with progressive enhancement
   - CDN integration for image delivery
   - WebP format for modern browsers
   - Responsive image srcsets

2. **Quality Control**
   - Relevance scoring based on tags and description
   - Manual review queue for auto-imported images
   - Duplicate detection using perceptual hashing
   - Color palette extraction for matching

3. **Rate Limit Management**
   - Exponential backoff for API errors
   - Request queue with priority system
   - Caching of search results
   - Webhook for rate limit updates

### Fallback Strategies
- Placeholder silhouettes by bird size category
- Generic habitat backgrounds
- AI-generated descriptions for prompt creation
- Community-contributed images

## ✅ COMPLETION

### Testing Strategy
- Unit tests for API integration
- Mock Unsplash responses for testing
- Image processing pipeline tests
- Rate limiter behavior verification

### Success Metrics
- Coverage: % of species with images
- Quality: Average image resolution
- Attribution: Compliance rate
- Performance: Image load times

### Deployment Checklist
- [ ] Unsplash API credentials configured
- [ ] Image storage directory created
- [ ] Rate limiter initialized
- [ ] Attribution templates ready
- [ ] Fallback images uploaded
- [ ] CDN configuration (optional)