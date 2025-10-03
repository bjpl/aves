# Image Pipeline Infrastructure Analysis

**Date**: October 2, 2025
**Project**: AVES - Visual Spanish Bird Learning Platform
**Analyst**: Image Pipeline Infrastructure Analyst

---

## Executive Summary

The AVES project has implemented a **hybrid image infrastructure** that combines external image sources (Unsplash) with a local storage system for imported images. The current implementation is **development-ready but NOT production-ready**, with several critical gaps in CDN integration, format optimization, and scalable storage infrastructure.

### Key Findings

| Category | Status | Production Ready |
|----------|--------|------------------|
| **Image Storage** | Local filesystem only | ❌ No |
| **Image Upload** | Basic implementation | ⚠️ Partial |
| **Image Delivery** | No CDN, no caching | ❌ No |
| **Image Management** | Database-tracked | ✅ Yes |
| **External Sources** | Unsplash integrated | ✅ Yes |
| **Performance** | Lazy loading only | ⚠️ Partial |

### Critical Gaps

1. **No CDN Integration** - Images served directly from backend
2. **No Modern Format Support** - No WebP/AVIF optimization
3. **Missing Upload Directory** - `/uploads` folder doesn't exist
4. **No Responsive Images** - No `srcset` or `<picture>` elements
5. **No Caching Strategy** - No browser or server caching headers
6. **No Image Compression Pipeline** - Only basic Sharp optimization

---

## 1. Image Storage Architecture

### Current Implementation

#### Storage Locations

```
File System:
├── backend/uploads/           [MISSING - Directory not created]
│   ├── images/                [Local full-size images]
│   └── thumbnails/            [Local thumbnail images]
│
External:
├── Unsplash CDN              [External source images]
│   └── images.unsplash.com   [Cached URLs in database]
│
Frontend Public:
└── public/data/              [Static JSON data only]
    ├── species.json          [Contains external imageUrl references]
    └── annotations.json
```

#### Storage Strategy

**File**: `backend/src/routes/images.ts` (Lines 218-257)

```typescript
async function processImage(imageUrl: string) {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const imagesDir = path.join(uploadsDir, 'images');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

  // Creates directories if they don't exist
  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(thumbnailsDir, { recursive: true });

  // Downloads from external URL
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  // Optimizes and resizes
  await sharp(buffer)
    .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(imagePath);

  // Generates thumbnail
  await sharp(buffer)
    .resize(400, 300, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
}
```

#### Database Schema

**File**: `database/schemas/005_image_sourcing.sql`

```sql
CREATE TABLE image_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID REFERENCES species(id) ON DELETE CASCADE,
    source_type VARCHAR(50) CHECK (source_type IN ('unsplash', 'midjourney', 'upload')),
    source_id VARCHAR(200),        -- External ID (Unsplash photo ID)
    original_url TEXT NOT NULL,    -- External URL
    local_path TEXT,               -- Local path: /uploads/images/{filename}
    thumbnail_path TEXT,           -- Thumbnail: /uploads/thumbnails/{filename}
    width INTEGER,
    height INTEGER,
    photographer_name VARCHAR(200),
    photographer_url TEXT,
    license_type VARCHAR(50) DEFAULT 'unsplash',
    attribution_required BOOLEAN DEFAULT true,
    relevance_score DECIMAL(3,2),
    downloaded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Issues Identified

❌ **CRITICAL**: `/backend/uploads` directory does not exist
- Backend expects to write to this directory
- Directory creation happens at runtime, not setup
- Production deployment will fail without persistent volume

❌ **No Static File Serving**: Backend doesn't serve `/uploads` directory
- File: `backend/src/index.ts` has NO `express.static` middleware
- Images saved to disk but cannot be accessed via HTTP

❌ **No Cloud Storage**: All images stored locally
- Not scalable for production
- No backup/redundancy
- No geographic distribution

### Recommendations

✅ **Immediate Fixes**:
```typescript
// backend/src/index.ts - Add after line 36
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));
```

✅ **Production Solution**:
- Integrate AWS S3 or Cloudinary for image storage
- Use CDN for delivery (CloudFront, Cloudflare)
- Keep database URLs but point to CDN endpoints

---

## 2. Image Upload & Processing

### Upload Implementation

#### Current Capabilities

**Dependencies** (from `backend/package.json`):
```json
{
  "multer": "^1.4.5-lts.1",    // File upload middleware
  "sharp": "^0.33.1",          // Image processing
  "axios": "^1.6.2"            // External downloads
}
```

#### Import Flow

**File**: `backend/src/routes/images.ts` (Lines 66-116)

```typescript
POST /api/images/import

Request:
{
  speciesId: string,
  imageUrl: string,          // External URL to download
  sourceType: 'unsplash' | 'midjourney' | 'upload',
  sourceId: string,          // External identifier
  photographer: {
    name: string,
    url: string
  }
}

Process:
1. Check for duplicates (species_id + source_id)
2. Download image from URL
3. Process with Sharp:
   - Resize to 1200x900 (max, aspect preserved)
   - Convert to JPEG @ 85% quality
   - Generate 400x300 thumbnail @ 80% quality
4. Save metadata to database
5. Return image record
```

#### Image Optimization

**Settings**:
```typescript
// Full-size image
.resize(1200, 900, {
  fit: 'inside',              // Preserve aspect ratio
  withoutEnlargement: true    // Don't upscale
})
.jpeg({ quality: 85 })

// Thumbnail
.resize(400, 300, {
  fit: 'cover'                // Crop to exact size
})
.jpeg({ quality: 80 })
```

### Issues Identified

❌ **Only JPEG Output**: No WebP or AVIF modern formats
- Missing 30-50% potential file size reduction
- No progressive JPEG encoding

❌ **No Upload Validation**: Missing file type/size checks
- No MIME type validation
- No malicious file detection
- Max file size only in `.env.example` (not enforced)

❌ **No Batch Processing**: One image at a time
- No queue system for bulk imports
- No worker processes for heavy processing

⚠️ **Limited Resizing Options**: Fixed dimensions only
- No responsive image generation (multiple sizes)
- No art direction support

### Recommendations

✅ **Add Modern Formats**:
```typescript
// Generate multiple formats
const formats = [
  { ext: 'webp', quality: 85 },
  { ext: 'avif', quality: 70 },
  { ext: 'jpg', quality: 85 }
];

for (const format of formats) {
  await sharp(buffer)[format.ext]({ quality: format.quality })
    .toFile(`${basePath}.${format.ext}`);
}
```

✅ **Add Validation Middleware**:
```typescript
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

---

## 3. Image Delivery

### Frontend Delivery

#### Lazy Loading Component

**File**: `frontend/src/components/ui/LazyImage.tsx`

**Features**:
- ✅ Intersection Observer API for viewport detection
- ✅ Blur-up placeholder effect
- ✅ Progressive image loading
- ✅ Error handling with fallback UI
- ✅ Configurable thresholds and margins

```typescript
<LazyImage
  src={imageUrl}
  alt="Bird photo"
  placeholder={lowResUrl}     // Optional
  blurAmount={20}             // Default blur for placeholder
  threshold={0.01}            // Trigger when 1% visible
  rootMargin="50px"           // Load 50px before entering viewport
/>
```

**Implementation Quality**: ⭐⭐⭐⭐⭐ Excellent

#### Usage Patterns

**File**: `frontend/src/components/species/SpeciesCard.tsx`

```typescript
{species.primaryImageUrl ? (
  <LazyImage
    src={species.primaryImageUrl}
    alt={species.spanishName}
    className="w-full h-full"
  />
) : (
  <div className="emoji-fallback">
    {getSizeIcon(species.sizeCategory)}
  </div>
)}
```

### Current Image Sources

**File**: `frontend/public/data/species.json`

```json
{
  "thumbnailUrl": "https://images.unsplash.com/photo-1551031895-7f8e06d714f8?w=400",
  "imageUrl": "https://images.unsplash.com/photo-1551031895-7f8e06d714f8?w=800"
}
```

All images currently served from **Unsplash CDN** (external dependency).

### Issues Identified

❌ **No Responsive Images**: No `srcset` or `<picture>` elements
```html
<!-- Current -->
<img src="image-800.jpg" alt="Bird" />

<!-- Should be -->
<img
  srcset="
    image-400.webp 400w,
    image-800.webp 800w,
    image-1200.webp 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  src="image-800.jpg"
  alt="Bird"
/>
```

❌ **No CDN Configuration**: Images would be served from backend
- No geographic distribution
- No edge caching
- High latency for global users

❌ **No Caching Headers**: Backend doesn't set cache-control
- Browser won't cache images efficiently
- Repeated downloads on every visit

❌ **No Image Preloading**: Critical images not preloaded
```html
<!-- Missing -->
<link rel="preload" as="image" href="hero-bird.webp" />
```

### Recommendations

✅ **Add Responsive Image Component**:
```typescript
export const ResponsiveImage: React.FC<Props> = ({ src, alt }) => {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${src}-400.avif 400w, ${src}-800.avif 800w`}
      />
      <source
        type="image/webp"
        srcSet={`${src}-400.webp 400w, ${src}-800.webp 800w`}
      />
      <img
        src={`${src}-800.jpg`}
        alt={alt}
        loading="lazy"
      />
    </picture>
  );
};
```

✅ **Add CDN Integration**:
```typescript
// config/cdn.ts
export const getCDNUrl = (path: string) => {
  const CDN_BASE = process.env.REACT_APP_CDN_URL || '';
  return CDN_BASE ? `${CDN_BASE}/${path}` : `/uploads/${path}`;
};
```

✅ **Add Caching Headers** (Backend):
```typescript
app.use('/uploads', express.static('uploads', {
  maxAge: '1y',              // Cache for 1 year
  immutable: true,           // Never revalidate
  etag: true,
  lastModified: true
}));
```

---

## 4. Image Management

### External Image Sources

#### Unsplash Integration

**File**: `frontend/src/services/unsplashService.ts`

**Implementation Quality**: ⭐⭐⭐⭐⭐ Excellent

**Features**:
- ✅ Rate limit tracking (50 requests/hour for free tier)
- ✅ Download event tracking (required by Unsplash API)
- ✅ Attribution generation (legal compliance)
- ✅ Photo relevance filtering
- ✅ Error handling

```typescript
class UnsplashService {
  async searchPhotos(query: string): Promise<ImageSearchResult>
  async getPhoto(photoId: string): Promise<UnsplashPhoto>
  async downloadPhoto(photo: UnsplashPhoto): Promise<void>

  getRateLimitStatus(): {
    remaining: number,
    resetTime: Date,
    isLimited: boolean
  }

  generateAttribution(photo: UnsplashPhoto): string
  isRelevantPhoto(photo: UnsplashPhoto, speciesName: string): boolean
}
```

#### Rate Limiting (Backend)

**File**: `backend/src/routes/images.ts` (Lines 16-48)

```sql
-- Tracks API usage
SELECT requests_made, requests_limit, reset_time
FROM api_rate_limits
WHERE api_name = 'unsplash'

-- Auto-resets after 1 hour
UPDATE api_rate_limits
SET requests_made = 0, reset_time = CURRENT_TIMESTAMP + INTERVAL '1 hour'
WHERE api_name = 'unsplash'
```

#### AI Prompt Generation

**File**: `frontend/src/services/promptGenerator.ts`

**Purpose**: Generate Midjourney prompts for species without Unsplash images

```typescript
generateMidjourneyPrompt(species: Species): string

Output Example:
"professional wildlife photography, Northern Cardinal,
red and black plumage, medium-sized, in lush forest setting,
sharp focus on bird, bokeh background, golden hour lighting,
high detail, 4k quality, national geographic style,
--no cartoon illustration drawing painting artistic"
```

### Admin Image Importer

**File**: `frontend/src/components/admin/ImageImporter.tsx`

**Features**:
- ✅ Species selection interface
- ✅ Unsplash search integration
- ✅ Image relevance filtering
- ✅ Duplicate detection
- ✅ Batch prompt generation
- ✅ Coverage statistics dashboard
- ✅ Rate limit warnings

**Workflow**:
1. Select species from list
2. Auto-generate search queries
3. Search Unsplash (filtered by relevance)
4. Preview and import images
5. Track attribution and download event
6. Update database with local paths

### Database Tracking

**Tables**:

1. **image_sources** - Stores all image metadata
2. **prompt_queue** - AI generation queue for missing images
3. **api_rate_limits** - External API usage tracking
4. **image_import_jobs** - Batch processing jobs

**Indexes**:
```sql
CREATE INDEX idx_sources_species ON image_sources(species_id);
CREATE INDEX idx_sources_type ON image_sources(source_type);
CREATE INDEX idx_sources_relevance ON image_sources(relevance_score DESC);
```

### Issues Identified

✅ **Well Implemented**: Image management is the strongest part
- Comprehensive database schema
- Good rate limiting
- Attribution tracking for legal compliance

⚠️ **Missing Features**:
- No image quality scoring
- No A/B testing for image selection
- No automatic image rotation/refresh
- No analytics on image performance

---

## 5. Performance & Optimization

### Current Optimizations

✅ **Implemented**:
1. Lazy loading with Intersection Observer
2. Blur-up placeholder effect
3. Image resizing (1200x900 max)
4. Thumbnail generation (400x300)
5. JPEG compression (85% quality)

### Performance Metrics

**Estimated Savings** (per image):

| Optimization | Before | After | Savings |
|--------------|--------|-------|---------|
| Resize to 1200px | 3-5 MB | 200-400 KB | 85-90% |
| JPEG @ 85% | 400 KB | 200 KB | 50% |
| WebP conversion | 200 KB | 80 KB | 60% |
| AVIF conversion | 200 KB | 50 KB | 75% |
| Lazy loading | All loaded | On-demand | 70-90%* |

*Depends on page length and user behavior

### Missing Optimizations

❌ **No Modern Formats**:
- WebP support: -30% file size
- AVIF support: -50% file size
- Progressive JPEG: Faster perceived load

❌ **No Image Sprites**: Multiple small images
- Could combine icons into single sprite sheet

❌ **No HTTP/2 Push**: Critical images not preloaded

❌ **No Service Worker Caching**: Offline support

❌ **No Adaptive Loading**: Same images for all devices
```typescript
// Should detect network speed
if (navigator.connection.effectiveType === '4g') {
  loadHighRes();
} else {
  loadLowRes();
}
```

### Recommendations

✅ **High Priority**:

```typescript
// 1. Multi-format generation
const generateResponsiveImages = async (buffer: Buffer, basename: string) => {
  const sizes = [400, 800, 1200];
  const formats = ['webp', 'avif', 'jpg'];

  for (const size of sizes) {
    for (const format of formats) {
      await sharp(buffer)
        .resize(size, null, { fit: 'inside' })
        [format]({ quality: format === 'avif' ? 70 : 85 })
        .toFile(`${basename}-${size}.${format}`);
    }
  }
};
```

```typescript
// 2. Adaptive loading hook
export const useAdaptiveImage = (srcSet: ImageSet) => {
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    const connection = navigator.connection;
    const effectiveType = connection?.effectiveType || '4g';

    if (effectiveType === '4g' || effectiveType === '3g') {
      setImageSrc(srcSet.high);
    } else {
      setImageSrc(srcSet.low);
    }
  }, [srcSet]);

  return imageSrc;
};
```

✅ **Medium Priority**:

- Implement image sprite sheets for UI icons
- Add service worker for offline caching
- Use HTTP/2 server push for hero images
- Add blur hash for instant placeholders

---

## 6. Production Readiness Checklist

### Infrastructure

- [ ] **Storage**
  - [ ] Migrate to cloud storage (S3, Cloudinary, etc.)
  - [ ] Set up CDN (CloudFront, Cloudflare)
  - [ ] Configure backup/redundancy
  - [ ] Set up geographic distribution

- [ ] **Delivery**
  - [ ] Implement CDN integration
  - [ ] Configure caching headers
  - [ ] Set up image optimization service
  - [ ] Enable HTTP/2 push

### Optimization

- [ ] **Format Support**
  - [ ] Add WebP generation
  - [ ] Add AVIF generation
  - [ ] Implement progressive JPEG
  - [ ] Add responsive image sets

- [ ] **Performance**
  - [ ] Implement service worker caching
  - [ ] Add image preloading
  - [ ] Optimize lazy loading thresholds
  - [ ] Add adaptive loading based on network

### Management

- [ ] **Upload System**
  - [ ] Add file validation (type, size, malware)
  - [ ] Implement upload queue
  - [ ] Add batch processing
  - [ ] Set up worker processes

- [ ] **Monitoring**
  - [ ] Track image load performance
  - [ ] Monitor CDN costs
  - [ ] Alert on rate limit approaches
  - [ ] Analytics on image effectiveness

### Security

- [ ] **Access Control**
  - [ ] Implement signed URLs for uploads
  - [ ] Add CORS configuration
  - [ ] Rate limit upload endpoints
  - [ ] Validate image content

---

## 7. Recommended Architecture

### Phase 1: Quick Wins (1-2 weeks)

```typescript
// 1. Add static file serving
app.use('/uploads', express.static('uploads', {
  maxAge: '1y',
  etag: true,
  immutable: true
}));

// 2. Add WebP generation
await sharp(buffer)
  .webp({ quality: 85 })
  .toFile(webpPath);

// 3. Update LazyImage to support multiple formats
<picture>
  <source srcSet={webpUrl} type="image/webp" />
  <img src={jpegUrl} alt={alt} loading="lazy" />
</picture>
```

### Phase 2: Cloud Migration (2-4 weeks)

```typescript
// cloudinary-service.ts
import { v2 as cloudinary } from 'cloudinary';

class CloudinaryService {
  async uploadImage(buffer: Buffer, filename: string) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'aves/species',
          format: 'auto',           // Auto WebP/AVIF
          quality: 'auto:good',     // Auto quality
          responsive: true,         // Generate responsive sizes
          transformation: [
            { width: 1200, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });
  }

  getResponsiveUrl(publicId: string, width: number) {
    return cloudinary.url(publicId, {
      width,
      crop: 'limit',
      fetch_format: 'auto',
      quality: 'auto'
    });
  }
}
```

### Phase 3: Advanced Optimization (4-6 weeks)

```typescript
// 1. Blur hash generation at upload
import { encode } from 'blurhash';

const generateBlurHash = async (buffer: Buffer) => {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  );
};

// 2. Store blur hash in database
ALTER TABLE image_sources ADD COLUMN blur_hash VARCHAR(50);

// 3. Use in LazyImage component
import { decode } from 'blurhash';

const BlurHashPlaceholder = ({ hash, width, height }) => {
  const pixels = decode(hash, width, height);
  // Render as canvas or data URL
};
```

---

## 8. Cost Estimates

### Option 1: AWS S3 + CloudFront

**Storage** (S3):
- 10,000 images @ 100KB avg = 1GB
- S3 Standard: $0.023/GB = **$0.02/month**

**Bandwidth** (CloudFront):
- 1M requests/month
- 100GB transfer/month
- Cost: **$10-20/month**

**Total**: ~$20/month for moderate usage

### Option 2: Cloudinary

**Free Tier**:
- 25GB storage
- 25GB bandwidth/month
- Automatic optimization
- **$0/month** for small projects

**Paid** (if exceeded):
- $99/month for 100GB bandwidth
- Includes all optimizations

### Option 3: Vercel + CDN

**Free Tier**:
- 100GB bandwidth/month
- Automatic edge caching
- **$0/month** for personal projects

**Pro**: $20/month with higher limits

---

## 9. Summary & Next Steps

### Current State: Development Grade ⭐⭐⭐☆☆

**Strengths**:
- ✅ Excellent lazy loading implementation
- ✅ Good database schema for image management
- ✅ Proper Unsplash integration with attribution
- ✅ AI-assisted image sourcing strategy

**Weaknesses**:
- ❌ No production storage infrastructure
- ❌ Missing modern image formats (WebP/AVIF)
- ❌ No CDN integration
- ❌ No responsive images
- ❌ Missing critical optimizations

### Immediate Actions Required

**Week 1** (Critical):
1. Create `/backend/uploads` directory structure
2. Add `express.static` middleware to serve uploads
3. Add file upload validation
4. Test image import end-to-end

**Week 2-3** (High Priority):
5. Integrate Cloudinary or AWS S3
6. Add WebP format generation
7. Implement responsive image sets
8. Add caching headers

**Week 4-6** (Medium Priority):
9. Implement blur hash placeholders
10. Add service worker for offline support
11. Set up monitoring and analytics
12. Optimize lazy loading thresholds

### Production Readiness: 4-6 Weeks

With focused effort, the image pipeline can be production-ready in **4-6 weeks**. Priority should be:

1. **Cloud storage** (eliminates deployment issues)
2. **Modern formats** (improves performance 30-50%)
3. **CDN integration** (reduces latency globally)
4. **Responsive images** (optimizes for all devices)

---

## Appendix A: File Reference

### Key Files Analyzed

| File Path | Purpose | Quality |
|-----------|---------|---------|
| `backend/src/routes/images.ts` | Image API endpoints | ⭐⭐⭐⭐ |
| `frontend/src/services/unsplashService.ts` | Unsplash integration | ⭐⭐⭐⭐⭐ |
| `frontend/src/components/ui/LazyImage.tsx` | Lazy loading component | ⭐⭐⭐⭐⭐ |
| `frontend/src/services/promptGenerator.ts` | AI prompt generation | ⭐⭐⭐⭐ |
| `frontend/src/components/admin/ImageImporter.tsx` | Admin import UI | ⭐⭐⭐⭐ |
| `database/schemas/005_image_sourcing.sql` | Database schema | ⭐⭐⭐⭐⭐ |
| `shared/types/image.types.ts` | Type definitions | ⭐⭐⭐⭐⭐ |

### Dependencies

**Backend**:
- `sharp@0.33.1` - Image processing
- `multer@1.4.5-lts.1` - File uploads
- `axios@1.6.2` - HTTP client

**Frontend**:
- Native Intersection Observer API
- React lazy loading patterns

---

## Appendix B: Code Snippets

### Complete Responsive Image Component

```typescript
// frontend/src/components/ui/ResponsiveImage.tsx

import React, { useState, useEffect } from 'react';

interface ImageSource {
  src: string;
  width: number;
  format: 'webp' | 'avif' | 'jpg';
}

interface ResponsiveImageProps {
  sources: ImageSource[];
  alt: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  className?: string;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  sources,
  alt,
  sizes = '100vw',
  loading = 'lazy',
  className
}) => {
  // Group sources by format
  const sourcesByFormat = sources.reduce((acc, source) => {
    if (!acc[source.format]) acc[source.format] = [];
    acc[source.format].push(source);
    return acc;
  }, {} as Record<string, ImageSource[]>);

  // Generate srcset for each format
  const generateSrcSet = (sources: ImageSource[]) => {
    return sources
      .map(s => `${s.src} ${s.width}w`)
      .join(', ');
  };

  // Fallback to JPEG
  const fallbackSrc = sources.find(s => s.format === 'jpg')?.src || sources[0]?.src;

  return (
    <picture>
      {sourcesByFormat.avif && (
        <source
          type="image/avif"
          srcSet={generateSrcSet(sourcesByFormat.avif)}
          sizes={sizes}
        />
      )}
      {sourcesByFormat.webp && (
        <source
          type="image/webp"
          srcSet={generateSrcSet(sourcesByFormat.webp)}
          sizes={sizes}
        />
      )}
      <img
        src={fallbackSrc}
        alt={alt}
        loading={loading}
        className={className}
      />
    </picture>
  );
};
```

### Cloud Upload Service

```typescript
// backend/src/services/imageUploadService.ts

import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export class ImageUploadService {
  async uploadSpeciesImage(
    buffer: Buffer,
    speciesId: string,
    metadata: ImageMetadata
  ): Promise<UploadedImage> {
    // Optimize before upload
    const optimized = await sharp(buffer)
      .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();

    // Upload to Cloudinary with transformations
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${optimized.toString('base64')}`,
      {
        folder: `aves/species/${speciesId}`,
        public_id: `${Date.now()}`,
        resource_type: 'image',
        format: 'auto',              // Auto-convert to WebP/AVIF
        quality: 'auto:good',        // Auto quality optimization
        responsive_breakpoints: {
          create_derived: true,
          bytes_step: 20000,
          min_width: 400,
          max_width: 1200,
          max_images: 3
        }
      }
    );

    // Generate responsive URLs
    return {
      id: result.public_id,
      url: result.secure_url,
      formats: {
        avif: cloudinary.url(result.public_id, { fetch_format: 'avif' }),
        webp: cloudinary.url(result.public_id, { fetch_format: 'webp' }),
        jpeg: cloudinary.url(result.public_id, { fetch_format: 'jpg' })
      },
      responsive: result.responsive_breakpoints[0].breakpoints.map(bp => ({
        url: bp.secure_url,
        width: bp.width
      })),
      metadata: {
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      }
    };
  }
}
```

---

**End of Report**

*This analysis represents the complete image pipeline infrastructure as of October 2, 2025.*
