# AVES Platform - API & Architecture Analysis
**System Architecture Analyst Report**
**Generated**: 2025-11-17
**Project**: AVES - Educational Bird Learning Platform
**Analysis Type**: Complete API Inventory & Architecture Mapping

---

## Executive Summary

AVES is a **full-stack educational platform** built as a three-tier monolithic application with microservice-ready architecture. The system combines traditional REST APIs with modern ML-powered features, leveraging Claude Sonnet 4.5 for AI capabilities.

### Key Metrics
- **60+ REST API endpoints** across 13 route modules
- **4,982 lines** of backend routing code
- **Zero GraphQL/WebSocket** endpoints (pure REST + polling)
- **2 primary external services** (Anthropic Claude, Unsplash)
- **Multi-tier caching** strategy (40-60% API call reduction)
- **Dual-mode deployment** (static frontend + API backend)

---

## 1. System Architecture Overview

### Architecture Pattern
**Three-Tier Monolithic with Service Layer Pattern**

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  React 18 SPA + TypeScript + Tailwind CSS + Vite           │
│  State: Zustand (client) + React Query (server)            │
│  Deployment: Static (Vercel/GitHub Pages)                   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST + JSON
                     │ Session-based (sessionStorage)
┌────────────────────┴────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  Node.js 18 + Express.js + TypeScript                       │
│  Middleware: Helmet, CORS, Rate Limit, Auth, Logging       │
│  Pattern: MVC-like with Service Layer                       │
│  Deployment: Railway (Docker/Kubernetes)                     │
└────────────────────┬────────────────────────────────────────┘
                     │ pg connection pool (5-20 connections)
                     │ SSL encrypted
┌────────────────────┴────────────────────────────────────────┐
│                      DATA LAYER                              │
│  PostgreSQL 14+ (Supabase hosted)                           │
│  Connection: Pooled (port 6543 transaction mode)            │
│  Future: Redis cache + CDN                                   │
└──────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                          INTERNET                               │
└───────┬─────────────────────────────────┬─────────────────────┘
        │                                 │
        │ HTTPS                          │ HTTPS
        ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│  Vercel/GitHub   │              │     Railway      │
│   Pages CDN      │              │   (Backend API)  │
│                  │              │                  │
│ Static Frontend  │────HTTP──────│  Express.js      │
│  React Bundle    │              │  Port 3001       │
└──────────────────┘              └────────┬─────────┘
                                           │
                                  ┌────────┴────────┐
                                  │   Supabase      │
                                  │  PostgreSQL     │
                                  │  Port 6543      │
                                  └─────────────────┘
```

---

## 2. Complete API Endpoint Inventory

### 2.1 Authentication & Authorization (3 endpoints)

**File**: `/backend/src/routes/auth.ts`

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/auth/register` | User registration with email/password | No |
| POST | `/api/auth/login` | JWT token generation | No |
| GET | `/api/auth/verify` | Verify JWT token validity | Yes (JWT) |

**Security Features**:
- Bcrypt password hashing (10 rounds)
- JWT with 24h expiration
- Production secret validation (32+ chars)
- Rate limiting: 5 requests/15min for auth endpoints

---

### 2.2 AI Annotation Management (13 endpoints)

**File**: `/backend/src/routes/aiAnnotations.ts` (Largest route: ~1,736 lines)

#### Core Annotation Operations

| Method | Endpoint | Purpose | Response Time Target |
|--------|----------|---------|---------------------|
| POST | `/api/ai/annotations` | Generate AI annotations for image | < 5s |
| GET | `/api/ai/annotations` | List AI annotations with filters | < 200ms |
| GET | `/api/ai/annotations/pending` | Get pending review annotations | < 200ms |
| GET | `/api/ai/annotations/stats` | Annotation statistics dashboard | < 300ms |

#### Review & Quality Control

| Method | Endpoint | Purpose | ML Integration |
|--------|----------|---------|----------------|
| POST | `/api/ai/annotations/:id/approve` | Approve annotation → production | Yes (feedback loop) |
| POST | `/api/ai/annotations/:id/reject` | Reject with categorized reason | Yes (pattern learning) |
| PATCH | `/api/ai/annotations/:id` | Edit annotation (keeps in review) | No |
| POST | `/api/ai/annotations/:id/edit` | Edit + approve (moves to production) | Yes |

#### Batch Operations

| Method | Endpoint | Purpose | Optimization |
|--------|----------|---------|--------------|
| POST | `/api/ai/annotations/batch/approve` | Bulk approve annotations | Transactional |
| POST | `/api/ai/annotations/batch/reject` | Bulk reject with reason | Transactional |

#### Analytics & Insights

| Method | Endpoint | Purpose | ML Component |
|--------|----------|---------|--------------|
| GET | `/api/ai/annotations/quality-metrics` | Quality score distribution | VisionAIService |
| GET | `/api/ai/annotations/performance-trends` | Acceptance rate over time | PatternLearner |
| GET | `/api/ai/annotations/confidence-distribution` | Confidence score analysis | Statistical |
| GET | `/api/ai/annotations/rejection-patterns` | Common rejection reasons | ML insights |

**AI Provider**: Anthropic Claude Sonnet 4.5
**Model**: `claude-sonnet-4-5-20250929`
**Vision Capabilities**: Image quality scoring (0-100 across 4 dimensions)

---

### 2.3 AI Exercise Generation (4 endpoints)

**File**: `/backend/src/routes/aiExercises.ts`

| Method | Endpoint | Purpose | AI Model |
|--------|----------|---------|----------|
| POST | `/api/ai/exercises/generate` | Generate contextual exercises | Claude Sonnet 4.5 |
| GET | `/api/ai/exercises/stats` | Exercise generation metrics | N/A |
| POST | `/api/ai/exercises/:id/feedback` | Submit exercise quality feedback | Reinforcement Learning |
| DELETE | `/api/ai/exercises/:id` | Remove generated exercise | N/A |

**Exercise Types Generated**:
- Visual identification (bird species)
- Contextual fill-in-the-blank
- Visual discrimination (compare/contrast)
- Vocabulary matching

---

### 2.4 Manual Annotations (5 endpoints)

**File**: `/backend/src/routes/annotations.ts`

| Method | Endpoint | Purpose | Cache Strategy |
|--------|----------|---------|----------------|
| GET | `/api/annotations/:imageId` | Get annotations for image | 5 min stale time |
| POST | `/api/annotations` | Create manual annotation | Invalidate cache |
| PUT | `/api/annotations/:id` | Update annotation | Invalidate cache |
| DELETE | `/api/annotations/:id` | Delete annotation | Invalidate cache |
| POST | `/api/annotations/:id/interaction` | Track user interaction | Analytics only |

---

### 2.5 Batch Processing (5 endpoints)

**File**: `/backend/src/routes/batch.ts`

| Method | Endpoint | Purpose | Async Processing |
|--------|----------|---------|------------------|
| POST | `/api/batch/annotations/start` | Start batch annotation job | Yes (job queue) |
| GET | `/api/batch/annotations/:jobId/status` | Check job status | Polling endpoint |
| POST | `/api/batch/annotations/:jobId/cancel` | Cancel running job | Yes |
| GET | `/api/batch/annotations/active` | List active jobs | Real-time |
| GET | `/api/batch/annotations/stats` | Batch processing statistics | Aggregated |

**Job Processing**: Async with PostgreSQL-based job queue
**Status Tracking**: Polling (no WebSockets)

---

### 2.6 Exercise Management (4 endpoints)

**File**: `/backend/src/routes/exercises.ts`

| Method | Endpoint | Purpose | Validation |
|--------|----------|---------|------------|
| POST | `/api/exercises` | Create exercise | Schema validation |
| POST | `/api/exercises/submit` | Submit exercise answer | Correctness check |
| GET | `/api/exercises` | List exercises with filters | Type filtering |
| GET | `/api/exercises/difficult-terms` | Identify struggling vocabulary | ML-based |

---

### 2.7 Feedback Analytics (4 endpoints)

**File**: `/backend/src/routes/feedbackAnalytics.ts`

| Method | Endpoint | Purpose | Data Source |
|--------|----------|---------|-------------|
| GET | `/api/analytics/feedback/learning-progress` | User progress tracking | vocabulary_interactions |
| GET | `/api/analytics/feedback/performance-trends` | Performance over time | exercise_results |
| GET | `/api/analytics/feedback/vocabulary-mastery` | Mastery level analysis | Aggregated |
| POST | `/api/analytics/feedback/track-event` | Track learning event | Event logging |

---

### 2.8 Image Management (6 endpoints)

**File**: `/backend/src/routes/images.ts`

| Method | Endpoint | Purpose | External API |
|--------|----------|---------|--------------|
| GET | `/api/images/:id` | Get image details | N/A |
| POST | `/api/images/search` | Search images with filters | N/A |
| POST | `/api/images/import` | Import from Unsplash | Unsplash API |
| POST | `/api/images/generate-prompts` | Generate AI prompts for images | Claude |
| GET | `/api/images/prompts` | List generated prompts | N/A |
| GET | `/api/images/stats` | Image database statistics | Aggregated |

**Unsplash Integration**:
- Rate limit: 50 requests/hour
- Attribution: Automatic photographer credit
- Search: Bird-specific queries

---

### 2.9 ML Analytics (6 endpoints)

**File**: `/backend/src/routes/mlAnalytics.ts`

| Method | Endpoint | Purpose | ML Component |
|--------|----------|---------|--------------|
| GET | `/api/ml/analytics/test` | Health check endpoint | N/A |
| GET | `/api/ml/analytics/annotation-performance` | Annotation quality metrics | VisionAIService |
| GET | `/api/ml/analytics/quality-trends` | Quality trends over time | Time-series |
| GET | `/api/ml/analytics/reinforcement-learning` | RL model performance | PatternLearner |
| GET | `/api/ml/analytics/pattern-insights` | Learned pattern analysis | Statistical |
| GET | `/api/ml/analytics/recommendation-effectiveness` | Recommendation success rate | Feedback loop |

**Reinforcement Learning Engine**: Active learning from user feedback

---

### 2.10 Species Database (5 endpoints)

**File**: `/backend/src/routes/species.ts`

| Method | Endpoint | Purpose | Cache Duration |
|--------|----------|---------|----------------|
| GET | `/api/species` | List all bird species | 10 min (static) |
| GET | `/api/species/:id` | Get species details | 10 min |
| GET | `/api/species/search` | Search by name/features | 1 min |
| GET | `/api/species/stats` | Species database statistics | 5 min |
| POST | `/api/species` | Add new species (admin) | Invalidate cache |

---

### 2.11 Vocabulary Learning (3 endpoints)

**File**: `/backend/src/routes/vocabulary.ts`

| Method | Endpoint | Purpose | Tracking |
|--------|----------|---------|----------|
| GET | `/api/vocabulary/terms` | Get vocabulary terms | N/A |
| POST | `/api/vocabulary/interact` | Log vocabulary interaction | Session-based |
| GET | `/api/vocabulary/progress` | Get learning progress | User-specific |

**Vocabulary Features**: 31 bird anatomy/behavior terms

---

### 2.12 Health Monitoring (1 endpoint)

**File**: `/backend/src/routes/health.ts`

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| GET | `/api/health` | System health check | { status, timestamp, db, ai } |

**Monitors**:
- Database connectivity
- AI service availability
- System uptime
- Memory usage

---

## 3. External Service Dependencies

### 3.1 Database: PostgreSQL (Supabase)

```yaml
Provider: Supabase
Version: PostgreSQL 14+
Connection Mode: Pooled (port 6543 transaction mode)
SSL: Required (rejectUnauthorized: false)

Pool Configuration:
  max_connections: 20
  min_connections: 5
  idle_timeout: 30000ms
  connection_timeout: 2000ms
  statement_timeout: 10000ms

Fallback Strategy:
  1. DATABASE_URL with pooler
  2. Direct Supabase connection
  3. IPv4-only forced connection
  4. Individual env vars (DB_HOST, DB_PORT, etc.)

Multi-Strategy Connection: Railway-specific connection logic
```

**Key Tables**:
- `users` - Authentication and profiles
- `images` - Image metadata and URLs
- `annotations` - Manual annotations
- `ai_annotations` - AI-generated annotations with quality scores
- `exercises` - Exercise definitions
- `exercise_images` - Exercise-image relationships
- `vocabulary_interactions` - Learning tracking
- `image_quality_assessments` - ML quality scores
- `image_usage_analytics` - Success metrics
- `pattern_learning_feedback` - Reinforcement learning data

---

### 3.2 AI Provider: Anthropic Claude

```yaml
Provider: Anthropic
Model: claude-sonnet-4-5-20250929
API Key: ANTHROPIC_API_KEY (env)
Migration: From OpenAI (Oct 5, 2025)

Configuration:
  max_tokens: 8192
  temperature: 0.3
  timeout: 30000ms
  max_retries: 3
  cost_tracking: enabled

Use Cases:
  1. Image Quality Validation (VisionAIService)
     - Analyzes bird images for educational suitability
     - Scores: clarity, composition, relevance, educational value
     - Output: 0-100 score per dimension + reasoning

  2. Annotation Generation (BirdDetectionService)
     - Identifies bird features in images
     - Generates bounding boxes
     - Labels: 31 vocabulary terms

  3. Exercise Generation (aiExerciseGenerator)
     - Creates contextual learning exercises
     - Adapts to user proficiency
     - Multi-type generation

  4. Pattern Learning (PatternLearner)
     - Analyzes feedback patterns
     - Provides optimization insights
     - Reinforcement learning guidance

Rate Limits:
  requests_per_minute: 20
  cost_alert_threshold: $10.00
```

---

### 3.3 Image Provider: Unsplash

```yaml
Provider: Unsplash
API URL: https://api.unsplash.com
Access Key: UNSPLASH_ACCESS_KEY (env)

Configuration:
  timeout: 10000ms
  rate_limit: 50 requests/hour
  max_daily: 5000 requests

Use Cases:
  - Bird image sourcing
  - Image import workflow
  - Automatic attribution

Compliance:
  - Photographer credit required
  - Download tracking required
  - Unsplash API guidelines followed
```

---

### 3.4 Authentication: Supabase Auth (Optional)

```yaml
Status: Optional Integration
Client Mode: @supabase/supabase-js
Primary Auth: JWT (jsonwebtoken)

Dual Authentication Support:
  1. JWT (Primary)
     - jsonwebtoken library
     - 24h expiration
     - Refresh tokens (7d)
     - Production secret validation

  2. Supabase Auth (Optional)
     - Frontend hooks available
     - useSupabaseAuth
     - useSupabaseAnnotations
     - Row-level security compatible

Session Management:
  storage: sessionStorage
  key: aves-session-id
  format: session-{timestamp}-{random}
  persistence: Session-scoped
  header: X-Session-Id
```

---

## 4. Data Flow & State Management

### 4.1 Frontend State Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT COMPONENTS                          │
│  Pages, Features, UI Components                             │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             │ Custom Hooks         │ Event Handlers
             ▼                      ▼
┌─────────────────────┐   ┌─────────────────────┐
│   REACT QUERY       │   │     ZUSTAND         │
│  (Server State)     │   │  (Client State)     │
│                     │   │                     │
│ - Query cache       │   │ - UI state          │
│ - Mutations         │   │ - Form state        │
│ - Optimistic updates│   │ - Local preferences │
│ - Auto refetch      │   │                     │
└──────────┬──────────┘   └─────────────────────┘
           │
           │ axios with interceptors
           ▼
┌─────────────────────────────────────────────────────────────┐
│                     API ADAPTER                              │
│  Dual-Mode: Backend API  OR  Client Storage                 │
│                                                              │
│  Backend Mode:           Client Mode (GitHub Pages):        │
│  - axios to Express API  - localStorage/indexedDB           │
│  - Session headers       - JSON export/import               │
│  - Error fallback        - Read-only constraints            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 React Query Cache Strategy

```typescript
Cache Tiers (Hierarchical Staleness):

┌──────────────────────────────────────────────────────────┐
│ STATIC (10 min stale, 30 min GC)                        │
│ - species-list, annotations-list, cms-birds             │
│ Reasoning: Core data rarely changes                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ SEMI-STATIC (5 min stale, 10 min GC)                    │
│ - species-details, lessons, quizzes                     │
│ Reasoning: Content changes occasionally                 │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ DYNAMIC (2 min stale, 5 min GC)                         │
│ - progress, exercise-stats, user data                   │
│ Reasoning: Updates frequently during sessions           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ REALTIME (30 sec stale, 2 min GC)                       │
│ - search results, active sessions                       │
│ Reasoning: Highly dynamic, user-driven data             │
└──────────────────────────────────────────────────────────┘

Performance Impact: 40-60% reduction in API calls
```

### 4.3 API Request Flow

```
Standard Request Flow:
─────────────────────

1. Component triggers hook (e.g., useAIAnnotations())
   ↓
2. React Query checks cache
   ↓
3. If stale → fetch via axios
   ↓
4. Axios interceptor adds headers:
   - X-Session-Id: {session}
   - Authorization: Bearer {jwt} (if authenticated)
   ↓
5. Express middleware chain:
   - Helmet (security headers)
   - CORS (origin validation)
   - Rate limiter (DDoS protection)
   - Auth middleware (JWT validation)
   - Request logger (pino-http)
   ↓
6. Route handler → Service layer → Database
   ↓
7. Response formatting (JSON)
   ↓
8. React Query cache update
   ↓
9. Component re-render with new data


Optimistic Update Flow:
─────────────────────

1. User action (e.g., approve annotation)
   ↓
2. onMutate: Update cache immediately
   - Cancel in-flight queries
   - Snapshot previous state
   - Apply optimistic change
   ↓
3. UI reflects change INSTANTLY (no loading state)
   ↓
4. API request sent in background
   ↓
5. onSuccess:
   - Invalidate related queries
   - Force refetch for consistency
   ↓
   OR
   ↓
6. onError:
   - Rollback to snapshot
   - Show error notification
   - Re-enable mutation
```

---

## 5. Security Architecture

### 5.1 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  NETWORK LAYER                                               │
│  - HTTPS only (HSTS enabled)                                │
│  - Force HTTPS in production                                │
│  - Trust proxy headers (Railway/cloud)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER                                           │
│  - Helmet.js (12+ security headers)                         │
│  - CORS (whitelist: localhost, Vercel, Railway)            │
│  - Rate limiting (100 req/15min, 5 req/15min auth)         │
│  - Request size validation (10MB max)                       │
│  - Input sanitization                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AUTHENTICATION LAYER                                        │
│  - JWT with strong secrets (32+ chars enforced)             │
│  - Bcrypt password hashing (10 rounds)                      │
│  - Session management (sessionStorage)                      │
│  - Token expiration (24h access, 7d refresh)               │
│  - Production secret validation                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                              │
│  - Parameterized queries (SQL injection prevention)         │
│  - Connection pooling (resource management)                 │
│  - SSL/TLS encrypted connections                            │
│  - Role-based access control (planned)                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Content Security Policy

```javascript
CSP Headers:
  default-src: 'self'
  script-src: 'self'
  style-src: 'self' 'unsafe-inline' // React inline styles
  img-src: 'self' data: https:      // Unsplash images
  connect-src: 'self' http://localhost:5173
  font-src: 'self' data:
  object-src: 'none'
  frame-src: 'none'

Additional Security Headers:
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  HSTS: max-age=31536000; includeSubDomains; preload
```

---

## 6. Performance Optimizations

### 6.1 Caching Strategy

```
Multi-Level Caching:

┌──────────────────────────────────────────────────────────┐
│ LEVEL 1: React Query Cache (Client-side)                │
│ - In-memory JavaScript cache                             │
│ - Hierarchical staleness (30s - 10min)                  │
│ - Automatic garbage collection                           │
│ - Impact: 40-60% fewer API calls                        │
└──────────────────────────────────────────────────────────┘
                        ↓ Cache miss
┌──────────────────────────────────────────────────────────┐
│ LEVEL 2: Application Cache (Planned - Redis)            │
│ - Server-side shared cache                              │
│ - Cross-request data sharing                            │
│ - Impact: Reduced database load                         │
└──────────────────────────────────────────────────────────┘
                        ↓ Cache miss
┌──────────────────────────────────────────────────────────┐
│ LEVEL 3: Database Query Cache (PostgreSQL)              │
│ - Native PostgreSQL query caching                       │
│ - Execution plan caching                                │
│ - Impact: Faster repeated queries                       │
└──────────────────────────────────────────────────────────┘
                        ↓ Cache miss
┌──────────────────────────────────────────────────────────┐
│ LEVEL 4: CDN (Planned - Static Assets)                  │
│ - Edge caching for images                               │
│ - Geographic distribution                               │
│ - Impact: <150ms image load time                        │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Database Optimizations

```sql
Connection Pooling:
  - Min connections: 5
  - Max connections: 20
  - Idle timeout: 30s
  - Connection timeout: 2s
  - Statement timeout: 10s

Indexes Created: 15+ strategic indexes
  - exercise_images(exercise_id, image_id)
  - ai_annotations(status, created_at)
  - image_quality_assessments(image_id, approval_status)
  - vocabulary_interactions(session_id, term_id)
  - Composite indexes for common queries
  - GIN indexes for array searches

Query Optimization:
  - Parameterized queries (prevent injection + plan caching)
  - Cursor-based pagination (scalable)
  - Selective column fetching (reduce payload)
  - JOIN optimization (indexed foreign keys)
```

### 6.3 API Performance Targets

```
Endpoint Performance Targets:

GET Endpoints (Data Retrieval):
  - p50: < 100ms
  - p95: < 200ms
  - p99: < 300ms

POST Endpoints (Mutations):
  - p50: < 200ms
  - p95: < 500ms
  - p99: < 1000ms

AI-Powered Endpoints:
  - Annotation generation: < 5s
  - Exercise generation: < 3s
  - Quality validation: < 2s
  - ML recommendations: < 500ms

Batch Operations:
  - Async processing (no timeout)
  - Status polling: < 200ms
  - Job queue throughput: 10+ jobs/min
```

---

## 7. Technology Stack Summary

### Backend
```yaml
Runtime: Node.js 18+
Language: TypeScript 5.3+
Framework: Express.js 4.18
Database Driver: pg (node-postgres)
Authentication: jsonwebtoken + bcryptjs
Security: helmet, cors, express-rate-limit
Logging: pino + pino-http + pino-pretty
File Upload: multer
Image Processing: sharp
Validation: zod
AI SDK: @anthropic-ai/sdk 0.65
HTTP Client: axios
```

### Frontend
```yaml
Runtime: Browser (ES2020+)
Language: TypeScript 5.3+
Framework: React 18+
Build Tool: Vite 5.0
Routing: react-router-dom 6.21
State (Server): @tanstack/react-query 5.90
State (Client): zustand 4.4
Styling: Tailwind CSS 3.4
UI Components: Custom + lucide-react icons
HTTP Client: axios
Testing: Vitest + Playwright
```

### Infrastructure
```yaml
Backend Hosting: Railway (Docker/Kubernetes)
Frontend Hosting: Vercel / GitHub Pages
Database: Supabase (PostgreSQL 14+)
CDN: Planned (Cloudflare/Vercel)
Cache: Planned (Redis)
Monitoring: Pino logs (Prometheus/Grafana planned)
```

---

## 8. Architectural Patterns

### 8.1 Backend Patterns

```
1. Service Layer Pattern
   ┌─────────────┐
   │   Routes    │ ← HTTP handling, validation
   └──────┬──────┘
          ↓
   ┌─────────────┐
   │  Services   │ ← Business logic
   └──────┬──────┘
          ↓
   ┌─────────────┐
   │  Database   │ ← Data persistence
   └─────────────┘

2. Middleware Chain Pattern
   Request → Security → CORS → Rate Limit → Auth → Logger → Route

3. Error Handling Pattern
   - Service throws typed errors
   - Global error middleware catches
   - Structured JSON response
   - Stack traces in dev only

4. Repository Pattern (Implicit)
   - Services abstract database queries
   - No direct SQL in routes
   - Prepared statements only
```

### 8.2 Frontend Patterns

```
1. Custom Hooks Pattern
   Component → Hook → React Query → API Adapter → Backend

2. Adapter Pattern
   - apiAdapter.ts switches between:
     a) Backend API mode (development/production)
     b) Client storage mode (GitHub Pages static)
   - Transparent to components
   - Fallback on API errors

3. Optimistic UI Pattern
   - Mutation triggers
   - Cache updated immediately
   - UI responds instantly
   - Background API call
   - Rollback on error

4. Query Key Factory Pattern
   - Hierarchical cache keys
   - Type-safe invalidation
   - Selective refetching
   - Example: ['species', 'list', { filter }]
```

---

## 9. Key Architectural Decisions (ADRs)

### ADR-001: Dual-Mode API Adapter
**Decision**: Support both backend API and static client-side storage
**Rationale**: Deploy to GitHub Pages (static) AND Vercel (dynamic)
**Tradeoff**: Code complexity vs deployment flexibility
**Status**: Implemented

### ADR-002: React Query for Data Fetching
**Decision**: Use @tanstack/react-query for all server state
**Rationale**: 40-60% reduction in API calls, automatic caching, optimistic updates
**Benefit**: Better UX, reduced backend load
**Status**: Implemented

### ADR-003: Claude Sonnet 4.5 over OpenAI
**Decision**: Migrate from OpenAI to Anthropic Claude
**Rationale**: Superior vision capabilities, cost efficiency
**Migration Date**: October 5, 2025
**Impact**: Better annotation quality, lower API costs
**Status**: Complete

### ADR-004: Supabase with Railway Fallback
**Decision**: Multi-strategy database connection
**Rationale**: Production resilience, avoid single point of failure
**Complexity**: Custom connection pooling logic
**Status**: Implemented

### ADR-005: Reinforcement Learning for Annotations
**Decision**: Implement feedback loop for ML improvement
**Rationale**: Improve annotation quality over time
**Component**: PatternLearner service
**Status**: Implemented

### ADR-006: Session-Based (Not User-Based) Tracking
**Decision**: Use sessionStorage for anonymous learning
**Rationale**: No login required for learners, privacy-focused
**Tradeoff**: No cross-device progress sync
**Status**: Implemented

### ADR-007: Monolithic with Service Layer (Not Microservices)
**Decision**: Single Express app, not microservices
**Rationale**: Team size, deployment simplicity, shared database
**Future**: Service layer enables future extraction
**Status**: Implemented

---

## 10. Integration Points

### 10.1 Frontend ↔ Backend

```
Communication Protocol: HTTP/REST + JSON
Authentication: JWT Bearer tokens OR Session headers
CORS Origins:
  - http://localhost:5173 (dev)
  - https://aves-frontend.vercel.app (prod)
  - https://bjpl.github.io (static)

Request Headers:
  - Content-Type: application/json
  - Authorization: Bearer {jwt} (optional)
  - X-Session-Id: {session} (required for tracking)

Response Format:
  Success: { data: T, message?: string }
  Error: { error: string, code?: string, details?: object }
```

### 10.2 Backend ↔ Database

```
Driver: pg (node-postgres)
Protocol: PostgreSQL wire protocol
Port: 6543 (Supabase pooler - transaction mode)
SSL: Required (rejectUnauthorized: false)

Query Pattern:
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }

Transaction Support: Yes (BEGIN/COMMIT/ROLLBACK)
Migration Tool: Custom TypeScript scripts
```

### 10.3 Backend ↔ AI Services

```
Anthropic Claude API:
  - SDK: @anthropic-ai/sdk
  - Authentication: API key (ANTHROPIC_API_KEY)
  - Rate Limit: 20 req/min
  - Timeout: 30s per request
  - Retries: 3 with exponential backoff

Request Pattern:
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
    temperature: 0.3,
    messages: [{ role: "user", content }]
  });

Cost Tracking: Enabled (alert threshold: $10)
```

---

## 11. Deployment Architecture

### 11.1 Production Environment

```
┌────────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                         │
└────────────────────────────────────────────────────────────┘

Frontend (Vercel):
  - Static React build (Vite)
  - Edge network distribution
  - Automatic HTTPS
  - Environment: VITE_API_URL → Railway backend
  - Build command: npm run build
  - Output: dist/

Backend (Railway):
  - Node.js 18 runtime
  - Docker container
  - Auto-scaling enabled
  - Environment variables: 50+ secrets
  - Health check: GET /health
  - Port: 3001
  - Start command: npm start (tsx src/index.ts)

Database (Supabase):
  - PostgreSQL 14+ managed
  - Automatic backups
  - Connection pooler (port 6543)
  - SSL required
  - Row-level security (planned)
```

### 11.2 Development Environment

```
Frontend:
  - npm run dev (Vite dev server)
  - Port: 5173
  - Hot module replacement
  - Mock data available

Backend:
  - npm run dev (tsx watch)
  - Port: 3001
  - Auto-restart on changes
  - Debug logging enabled
  - DEV_AUTH_BYPASS=true (optional)

Database:
  - Local PostgreSQL OR Supabase
  - Test database: separate instance
  - Migrations: npm run migrate
```

---

## 12. Monitoring & Observability

### 12.1 Logging Strategy

```javascript
Logger: Pino (high-performance JSON logger)

Log Levels:
  - trace: Detailed debugging (disabled in prod)
  - debug: Debug information
  - info: General information (default)
  - warn: Warning conditions
  - error: Error conditions
  - fatal: Critical errors

Log Targets:
  - Development: Console (pino-pretty for human-readable)
  - Production: JSON stdout (for log aggregation)

Logged Events:
  - All HTTP requests (pino-http)
  - Database connections
  - AI API calls with cost tracking
  - Authentication attempts
  - Errors with stack traces (dev only)
  - Performance metrics (slow queries)

Sensitive Data Sanitization: Enabled
  - Passwords redacted
  - API keys masked
  - JWT tokens truncated
```

### 12.2 Health Monitoring

```
Endpoint: GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "uptime": 86400,
  "database": {
    "connected": true,
    "latency_ms": 12
  },
  "ai_services": {
    "claude": "available",
    "unsplash": "available"
  },
  "memory": {
    "used_mb": 256,
    "total_mb": 512
  }
}

Monitoring Points:
  - Database connection pool status
  - API response times (p50, p95, p99)
  - Error rates
  - AI API costs
  - Cache hit rates (planned)
```

---

## 13. API Documentation

### 13.1 OpenAPI/Swagger
**Status**: Not implemented
**Recommendation**: Add swagger-jsdoc + swagger-ui-express

### 13.2 TypeScript Interfaces

```typescript
// All API types defined in:
/frontend/src/types/api.types.ts

// Example:
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface ExerciseAnswerSubmission {
  exerciseId: string;
  answer: string | string[];
  sessionId: string;
}

export interface ExerciseResult {
  exerciseId: string;
  answer: string | string[];
  correct: boolean;
  timestamp: Date;
  sessionId: string;
  explanation?: string;
}
```

---

## 14. Recommendations

### 14.1 Immediate Improvements

1. **Add API Documentation**
   - Implement OpenAPI/Swagger
   - Auto-generate from TypeScript types
   - Interactive API explorer

2. **Implement Redis Caching**
   - Reduce database load
   - Share cache across instances
   - Faster ML recommendation lookups

3. **Add Real-Time Updates**
   - WebSocket support for batch job status
   - Live annotation review updates
   - Reduce polling overhead

4. **Enhance Monitoring**
   - Prometheus metrics export
   - Grafana dashboards
   - Alert on error thresholds

5. **API Versioning**
   - Implement /api/v1/ prefix
   - Plan for breaking changes
   - Backwards compatibility strategy

### 14.2 Architecture Evolution

1. **GraphQL Gateway (Future)**
   - Reduce over-fetching
   - Client-driven queries
   - Real-time subscriptions

2. **Microservices Extraction (Future)**
   - ML services → separate service
   - Image processing → separate service
   - Service layer already prepared for extraction

3. **CDN Integration**
   - Cloudflare or Vercel CDN
   - Image optimization and delivery
   - Edge caching for static content

4. **Message Queue (Future)**
   - Replace polling with pub/sub
   - Better batch job orchestration
   - Bull/BullMQ or AWS SQS

---

## 15. Conclusion

AVES is a **well-architected, modern full-stack application** with:
- ✅ Clear separation of concerns
- ✅ Scalable architecture patterns
- ✅ Performance optimizations in place
- ✅ Security best practices
- ✅ ML-powered features with Claude integration
- ✅ Dual-deployment flexibility

**Strengths**:
- React Query caching reduces API load by 40-60%
- Multi-strategy database connection for resilience
- Reinforcement learning improves quality over time
- Stateless API design enables horizontal scaling

**Areas for Growth**:
- Add Redis for server-side caching
- Implement WebSocket for real-time updates
- Add comprehensive API documentation (OpenAPI)
- Enhanced monitoring and alerting

**Overall Assessment**: Production-ready architecture with clear path for scaling.

---

## Appendix: API Endpoint Quick Reference

### Authentication (3)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/verify`

### AI Annotations (13)
- `POST /api/ai/annotations` - Generate
- `GET /api/ai/annotations` - List with filters
- `GET /api/ai/annotations/pending` - Review queue
- `GET /api/ai/annotations/stats` - Dashboard stats
- `POST /api/ai/annotations/:id/approve` - Approve
- `POST /api/ai/annotations/:id/reject` - Reject
- `PATCH /api/ai/annotations/:id` - Edit (stay in review)
- `POST /api/ai/annotations/:id/edit` - Edit + approve
- `POST /api/ai/annotations/batch/approve` - Bulk approve
- `POST /api/ai/annotations/batch/reject` - Bulk reject
- `GET /api/ai/annotations/quality-metrics` - Quality distribution
- `GET /api/ai/annotations/performance-trends` - Trends
- `GET /api/ai/annotations/rejection-patterns` - Patterns

### AI Exercises (4)
- `POST /api/ai/exercises/generate`
- `GET /api/ai/exercises/stats`
- `POST /api/ai/exercises/:id/feedback`
- `DELETE /api/ai/exercises/:id`

### Annotations (5)
- `GET /api/annotations/:imageId`
- `POST /api/annotations`
- `PUT /api/annotations/:id`
- `DELETE /api/annotations/:id`
- `POST /api/annotations/:id/interaction`

### Batch Processing (5)
- `POST /api/batch/annotations/start`
- `GET /api/batch/annotations/:jobId/status`
- `POST /api/batch/annotations/:jobId/cancel`
- `GET /api/batch/annotations/active`
- `GET /api/batch/annotations/stats`

### Exercises (4)
- `POST /api/exercises`
- `POST /api/exercises/submit`
- `GET /api/exercises`
- `GET /api/exercises/difficult-terms`

### Analytics (4)
- `GET /api/analytics/feedback/learning-progress`
- `GET /api/analytics/feedback/performance-trends`
- `GET /api/analytics/feedback/vocabulary-mastery`
- `POST /api/analytics/feedback/track-event`

### Images (6)
- `GET /api/images/:id`
- `POST /api/images/search`
- `POST /api/images/import`
- `POST /api/images/generate-prompts`
- `GET /api/images/prompts`
- `GET /api/images/stats`

### ML Analytics (6)
- `GET /api/ml/analytics/test`
- `GET /api/ml/analytics/annotation-performance`
- `GET /api/ml/analytics/quality-trends`
- `GET /api/ml/analytics/reinforcement-learning`
- `GET /api/ml/analytics/pattern-insights`
- `GET /api/ml/analytics/recommendation-effectiveness`

### Species (5)
- `GET /api/species`
- `GET /api/species/:id`
- `GET /api/species/search`
- `GET /api/species/stats`
- `POST /api/species`

### Vocabulary (3)
- `GET /api/vocabulary/terms`
- `POST /api/vocabulary/interact`
- `GET /api/vocabulary/progress`

### Health (1)
- `GET /api/health`

**Total: 60 endpoints across 13 route modules**

---

**End of Analysis**
**Generated by**: System Architecture Analyst Agent
**Memory Namespace**: `audit/*`
**Date**: 2025-11-17
