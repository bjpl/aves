# ADR-003: Database Architecture - Supabase with PostgreSQL and Row Level Security

**Status:** Accepted
**Date:** 2025-11-27
**Decision Makers:** Development Team, Infrastructure Lead
**Tags:** #database #postgresql #supabase #security #rls

---

## Context

AVES requires a scalable, secure database solution for:

- User authentication and session management
- Bird species data and taxonomic relationships
- Image annotations and AI-generated content
- User progress tracking and analytics
- Real-time vocabulary disclosure state

**Problem Statement:** What database architecture should we use to support secure multi-user data access, real-time updates, and scalable storage?

**Constraints:**
- Must support PostgreSQL (production-standard relational database)
- Must provide built-in authentication and authorization
- Must scale from development to production
- Must support real-time subscriptions for frontend
- Must integrate with existing TypeScript stack
- Cost must be reasonable for educational platform

---

## Decision

We will use **Supabase** (hosted PostgreSQL) with **Row Level Security (RLS)** policies.

**Architecture:**
```
┌─────────────────────────────────────────────┐
│           Supabase Platform                 │
│  ┌──────────────────────────────────────┐  │
│  │     PostgreSQL 14+ Database          │  │
│  │  - Row Level Security (RLS)          │  │
│  │  - Full-text search                  │  │
│  │  - JSON/JSONB support                │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │     Supabase Auth (JWT)              │  │
│  │  - Email/password authentication     │  │
│  │  - Session management                │  │
│  │  - Role-based access control         │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │     Real-time Engine                 │  │
│  │  - WebSocket subscriptions           │  │
│  │  - Database change streams           │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Key Features:**
1. PostgreSQL 14+ for relational data integrity
2. Row Level Security for fine-grained access control
3. Supabase Auth for user authentication (JWT-based)
4. Real-time subscriptions for live data updates
5. Direct database access + Supabase Client SDK
6. Built-in connection pooling and performance optimization

---

## Consequences

### Positive

✅ **Built-in Authentication**
- JWT-based authentication out of the box
- Email/password and OAuth providers supported
- Session management handled by platform
- Reduces custom auth code by ~70%

✅ **Row Level Security (RLS)**
- Database-level authorization (secure by default)
- User can only access their own data
- Prevents unauthorized data access even if API compromised
- Declarative security policies

Example RLS Policy:
```sql
CREATE POLICY "Users can only see their own progress"
  ON user_vocabulary_progress
  FOR SELECT
  USING (auth.uid() = user_id);
```

✅ **Real-time Subscriptions**
- Frontend can subscribe to database changes
- Instant UI updates when data changes
- Reduces polling and API requests
- Built-in WebSocket management

✅ **Developer Experience**
- TypeScript SDK with excellent type inference
- Automatic API generation from schema
- Database migrations with version control
- Local development with Supabase CLI

✅ **Scalability**
- Connection pooling built-in
- Horizontal scaling supported
- CDN for static assets
- Read replicas available (paid tiers)

### Negative

⚠️ **Vendor Lock-in**
- Supabase-specific features (Auth, Realtime) difficult to migrate
- RLS policies tied to Supabase auth system
- Custom PostgreSQL functions may need refactoring if migrating

⚠️ **Learning Curve**
- RLS policy syntax requires PostgreSQL expertise
- Debugging RLS policies can be challenging
- Real-time subscriptions add complexity

⚠️ **Cost at Scale**
- Free tier has limitations (500MB database, 50MB file storage)
- Paid tiers start at $25/month
- Costs increase with database size and bandwidth

⚠️ **Direct Database Access Risks**
- Frontend has direct database access (via Supabase client)
- RLS policies are critical (no backend validation layer)
- Must be careful with exposed database structure

### Mitigations

1. **Abstraction Layer for Critical Operations:**
```typescript
// Use backend API for complex business logic
// Use Supabase client for simple CRUD operations
export class VocabularyService {
  // Complex logic: backend API
  async generateExercises() {
    return apiClient.post('/api/exercises/generate');
  }

  // Simple CRUD: Supabase client
  async getProgress(userId: string) {
    return supabase
      .from('user_vocabulary_progress')
      .select('*')
      .eq('user_id', userId);
  }
}
```

2. **RLS Policy Testing:**
```sql
-- Test RLS policies with different user contexts
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub TO 'user-id';
SELECT * FROM user_vocabulary_progress; -- Should only return user's data
```

3. **Migration Strategy:**
- Keep database schema portable (standard PostgreSQL)
- Avoid Supabase-specific features in core tables
- Document RLS policies for future migration

4. **Cost Management:**
- Monitor database size and optimize queries
- Archive old data to reduce storage costs
- Use database functions for complex queries (reduce network bandwidth)

---

## Alternatives Considered

### Alternative 1: Plain PostgreSQL + Custom Auth

**Pros:**
- No vendor lock-in
- Full control over database
- Lower cost (self-hosted)

**Cons:**
- Must implement authentication from scratch
- No real-time subscriptions
- More infrastructure management
- **Rejected because:** Development time and complexity overhead

### Alternative 2: Firebase Firestore

**Pros:**
- Real-time by default
- Excellent Firebase ecosystem
- Easy authentication integration

**Cons:**
- NoSQL (less suitable for relational data)
- Complex queries are difficult
- Pricing can be unpredictable
- **Rejected because:** Need relational database for taxonomic data

### Alternative 3: MongoDB Atlas

**Pros:**
- Flexible schema (JSON documents)
- Good free tier
- Excellent geospatial support

**Cons:**
- NoSQL (less suitable for relational joins)
- No built-in authentication
- Weaker consistency guarantees
- **Rejected because:** Taxonomic relationships require relational database

---

## Implementation Details

### Database Schema

**Core Tables:**
```sql
-- Species taxonomy (relational structure)
CREATE TABLE species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scientific_name TEXT UNIQUE NOT NULL,
  common_name_en TEXT NOT NULL,
  common_name_es TEXT NOT NULL,
  family TEXT NOT NULL,
  order TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress (RLS protected)
CREATE TABLE user_vocabulary_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id UUID REFERENCES vocabulary_terms(id),
  disclosure_level INT DEFAULT 0,
  last_reviewed TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, term_id)
);

-- RLS Policy
ALTER TABLE user_vocabulary_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_vocab_select"
  ON user_vocabulary_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_vocab_insert"
  ON user_vocabulary_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Connection Strategy

**Backend: Direct PostgreSQL Connection**
```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // connection pool size
});
```

**Frontend: Supabase Client**
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
```

### Real-time Subscriptions

**Frontend Example:**
```typescript
// Subscribe to vocabulary progress updates
const subscription = supabase
  .from('user_vocabulary_progress')
  .on('INSERT', (payload) => {
    console.log('New progress:', payload.new);
    updateUI(payload.new);
  })
  .subscribe();

// Cleanup
return () => subscription.unsubscribe();
```

---

## Security Architecture

### Authentication Flow

```
┌─────────┐                    ┌──────────────┐
│ Frontend│                    │   Supabase   │
│  Client │                    │     Auth     │
└────┬────┘                    └──────┬───────┘
     │                                │
     │  POST /auth/signup             │
     ├────────────────────────────────>│
     │                                │
     │  JWT + Refresh Token           │
     │<────────────────────────────────┤
     │                                │
     │  Authenticated requests        │
     │  (Authorization: Bearer JWT)   │
     ├────────────────────────────────>│
     │                                │
     │  RLS policies enforce access   │
     │<────────────────────────────────┤
```

### RLS Policy Patterns

**User-owned Data:**
```sql
CREATE POLICY "user_owns_data"
  ON table_name
  USING (auth.uid() = user_id);
```

**Public Read, Authenticated Write:**
```sql
CREATE POLICY "public_read"
  ON species FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "authenticated_write"
  ON species FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

**Admin-only Access:**
```sql
CREATE POLICY "admin_access"
  ON sensitive_table
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

---

## Performance Optimization

### Indexing Strategy

```sql
-- User progress queries
CREATE INDEX idx_user_vocab_user_id ON user_vocabulary_progress(user_id);
CREATE INDEX idx_user_vocab_term_id ON user_vocabulary_progress(term_id);

-- Species search
CREATE INDEX idx_species_common_name_es ON species USING GIN (to_tsvector('spanish', common_name_es));

-- Composite index for common query
CREATE INDEX idx_annotations_species_user ON annotations(species_id, user_id) WHERE deleted_at IS NULL;
```

### Query Optimization

**Use Database Functions for Complex Queries:**
```sql
CREATE OR REPLACE FUNCTION get_user_vocabulary_stats(p_user_id UUID)
RETURNS TABLE(total_terms INT, mastered_terms INT, in_progress_terms INT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT AS total_terms,
    COUNT(*) FILTER (WHERE disclosure_level = 4)::INT AS mastered_terms,
    COUNT(*) FILTER (WHERE disclosure_level BETWEEN 1 AND 3)::INT AS in_progress_terms
  FROM user_vocabulary_progress
  WHERE user_id = p_user_id;
END;
$$;
```

---

## Disaster Recovery

### Backup Strategy

1. **Automated Backups:** Supabase performs daily backups (7-day retention on free tier)
2. **Point-in-Time Recovery:** Available on paid tiers
3. **Manual Exports:** `pg_dump` for critical data

### Migration Scripts

```bash
# Export schema
pg_dump $DATABASE_URL --schema-only > schema.sql

# Export data
pg_dump $DATABASE_URL --data-only > data.sql

# Restore
psql $NEW_DATABASE_URL < schema.sql
psql $NEW_DATABASE_URL < data.sql
```

---

## Related Decisions

- **ADR-007:** Authentication Flow (JWT + Supabase Auth)
- **ADR-010:** API Design (RESTful + Supabase client)

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2025-11-27 | Development Team | Accepted | Supabase selected |
| 2025-12-04 | Documentation Engineer | Documented | ADR created |

---

**Last Updated:** 2025-12-04
**Status:** ✅ Implemented and Operational
**Database Version:** PostgreSQL 14+
**Supabase Tier:** Free (migrating to Pro recommended for production)
