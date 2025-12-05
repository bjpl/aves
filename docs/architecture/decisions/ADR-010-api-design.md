# ADR-010: API Design - RESTful with Zod Validation

**Status:** Accepted
**Date:** 2025-11-27
**Decision Makers:** Backend Team, Frontend Team
**Tags:** #api #rest #validation #zod #typescript

---

## Context

AVES requires a well-designed API for:

- **Frontend-Backend Communication:** Type-safe data exchange
- **Third-Party Integration:** Future mobile apps, webhooks
- **Data Validation:** Prevent invalid data from entering system
- **Documentation:** Clear API contracts for developers
- **Versioning:** Support API evolution without breaking clients

**Problem Statement:** What API design approach should we use to ensure type safety, validation, and maintainability?

**Constraints:**
- Must integrate with Express.js backend
- Must support TypeScript type inference
- Must validate request/response data
- Should be RESTful (industry standard)
- Should auto-generate documentation
- Must prevent injection attacks

---

## Decision

We will use **RESTful API design** with **Zod validation** for type-safe schemas.

**Core Principles:**

1. **REST Architecture:** Resource-based endpoints with standard HTTP methods
2. **Zod Schemas:** Runtime validation + TypeScript type inference
3. **Structured Responses:** Consistent JSON format
4. **Error Handling:** Standard HTTP status codes with error details
5. **API Versioning:** `/api/v1` prefix for future compatibility

**API Design:**

```
┌──────────────────────────────────────────────┐
│            Frontend Client                   │
└─────────────────┬────────────────────────────┘
                  │
                  │  POST /api/v1/annotations
                  │  { "speciesId": "...", "featureType": "..." }
                  ▼
┌──────────────────────────────────────────────┐
│          Express Route Handler               │
│  ┌────────────────────────────────────────┐  │
│  │  1. Zod Validation Middleware          │  │
│  │     - Validate request body            │  │
│  │     - Return 400 if invalid            │  │
│  └────────────┬───────────────────────────┘  │
│               ▼                               │
│  ┌────────────────────────────────────────┐  │
│  │  2. Authentication Middleware          │  │
│  │     - Verify JWT token                 │  │
│  │     - Return 401 if unauthorized       │  │
│  └────────────┬───────────────────────────┘  │
│               ▼                               │
│  ┌────────────────────────────────────────┐  │
│  │  3. Route Handler                      │  │
│  │     - Call service layer               │  │
│  │     - Format response                  │  │
│  └────────────┬───────────────────────────┘  │
└───────────────┼───────────────────────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │   JSON Response           │
    │   { "id": "...", ... }    │
    └───────────────────────────┘
```

---

## Consequences

### Positive

✅ **Type Safety End-to-End**
- Zod schemas → TypeScript types automatically
- Frontend knows exact API contracts
- Catch type errors at compile time

```typescript
const AnnotationSchema = z.object({
  speciesId: z.string().uuid(),
  featureType: z.enum(['anatomy', 'color', 'behavior']),
});

type Annotation = z.infer<typeof AnnotationSchema>;
// Annotation type automatically derived
```

✅ **Runtime Validation**
- Zod validates data at runtime
- Prevents invalid data from entering database
- Clear error messages for clients

✅ **Self-Documenting**
- Zod schemas serve as documentation
- Can generate OpenAPI specs from schemas
- Reduces documentation drift

✅ **Security**
- Prevents injection attacks (validated inputs)
- Type coercion prevents unexpected behavior
- Request body size limits enforced

✅ **Developer Experience**
- IntelliSense autocomplete for API types
- Faster development (types inferred)
- Fewer bugs from type mismatches

### Negative

⚠️ **Validation Overhead**
- Zod validation adds ~1-2ms per request
- Larger schemas can be slower
- Mitigated by: validation is fast enough for our use case

⚠️ **Schema Duplication**
- Frontend and backend must share schemas
- Requires shared types directory
- Mitigated by: monorepo with shared/ directory

⚠️ **Breaking Changes**
- API changes can break frontend
- Versioning required for backward compatibility
- Mitigated by: `/api/v1` prefix and deprecation strategy

### Mitigations

1. **Shared Type System:**
```typescript
// shared/types/annotation.types.ts
export const CreateAnnotationSchema = z.object({
  speciesId: z.string().uuid(),
  featureType: z.enum(['anatomy', 'color', 'behavior']),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

export type CreateAnnotationData = z.infer<typeof CreateAnnotationSchema>;
```

2. **API Versioning:**
```typescript
// v1 routes
app.use('/api/v1', v1Routes);

// v2 routes (future)
app.use('/api/v2', v2Routes);
```

3. **Deprecation Strategy:**
```typescript
// Deprecated endpoint
router.get('/api/species/:id/annotations', (req, res) => {
  res.set('X-API-Deprecated', 'true');
  res.set('X-API-Sunset', '2026-01-01');
  // ... handle request
});
```

---

## Alternatives Considered

### Alternative 1: GraphQL

**Pros:**
- Flexible queries (clients fetch only needed data)
- Strong typing with GraphQL schema
- Subscriptions for real-time

**Cons:**
- More complex setup
- Larger learning curve
- Over-fetching less of a problem for our use case
- **Rejected because:** REST simpler and sufficient

### Alternative 2: tRPC

**Pros:**
- End-to-end type safety (no code generation)
- Automatic API client
- Great developer experience

**Cons:**
- TypeScript-only (no third-party integration)
- Requires shared monorepo
- Less mature than REST
- **Rejected because:** Need support for non-TypeScript clients (future mobile apps)

### Alternative 3: JSON Schema Validation

**Pros:**
- Industry standard
- Mature ecosystem
- Language-agnostic

**Cons:**
- No TypeScript type inference
- Verbose schema definition
- Manual type definitions required
- **Rejected because:** Zod provides better TypeScript integration

---

## Implementation Details

### Route Definition with Zod

**Validation Middleware:**
```typescript
// backend/src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}
```

**Route with Validation:**
```typescript
// backend/src/routes/annotations.ts
import { Router } from 'express';
import { validate } from '@/middleware/validate';
import { CreateAnnotationSchema } from '@shared/types/annotation.types';
import { authenticateUser } from '@/middleware/auth';

const router = Router();

router.post(
  '/annotations',
  authenticateUser,
  validate(CreateAnnotationSchema),
  async (req, res, next) => {
    try {
      // req.body is now typed and validated
      const annotation = await annotationService.create(
        req.user.id,
        req.body
      );

      res.status(201).json(annotation);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### API Response Format

**Success Response:**
```json
{
  "id": "uuid-123",
  "speciesId": "species-456",
  "featureType": "anatomy",
  "boundingBox": {
    "x": 100,
    "y": 200,
    "width": 50,
    "height": 50
  },
  "createdAt": "2025-11-27T12:00:00Z"
}
```

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": "boundingBox.width",
      "message": "Number must be greater than 0"
    }
  ]
}
```

**Paginated Response:**
```json
{
  "data": [
    { "id": "1", "name": "..." },
    { "id": "2", "name": "..." }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

### REST Endpoint Patterns

**Resource-Based URLs:**
```
GET    /api/v1/species              List all species
GET    /api/v1/species/:id          Get single species
POST   /api/v1/species              Create species
PUT    /api/v1/species/:id          Update species
DELETE /api/v1/species/:id          Delete species

GET    /api/v1/species/:id/annotations    Get species annotations
POST   /api/v1/annotations                 Create annotation
```

**HTTP Methods:**
- `GET`: Retrieve resources (safe, idempotent)
- `POST`: Create resources (not idempotent)
- `PUT`: Update/replace resources (idempotent)
- `PATCH`: Partial update (not used currently)
- `DELETE`: Delete resources (idempotent)

**Status Codes:**
- `200 OK`: Successful GET/PUT/DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing/invalid auth token
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource doesn't exist
- `500 Internal Server Error`: Server error

---

## Schema Examples

### Create Annotation Schema

```typescript
// shared/types/annotation.types.ts
export const CreateAnnotationSchema = z.object({
  speciesId: z.string().uuid('Invalid species ID'),
  featureType: z.enum(['anatomy', 'color', 'behavior']),
  boundingBox: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    width: z.number().int().positive('Width must be positive'),
    height: z.number().int().positive('Height must be positive'),
  }),
  label: z.string().min(1).max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type CreateAnnotationData = z.infer<typeof CreateAnnotationSchema>;
```

### Query Parameters Schema

```typescript
export const ListSpeciesQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
  habitat: z.enum(['forest', 'grassland', 'wetland', 'urban']).optional(),
  orderBy: z.enum(['name', 'family', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ListSpeciesQuery = z.infer<typeof ListSpeciesQuerySchema>;
```

**Usage:**
```typescript
router.get(
  '/species',
  validate(ListSpeciesQuerySchema, 'query'), // Validate query params
  async (req, res) => {
    const { page, limit, habitat, orderBy, order } = req.query;
    // Query params are now typed and validated
    const species = await speciesService.list({
      page,
      limit,
      habitat,
      orderBy,
      order,
    });

    res.json(species);
  }
);
```

### Nested Schemas

```typescript
const UserPreferencesSchema = z.object({
  language: z.enum(['en', 'es']),
  theme: z.enum(['light', 'dark']),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  preferences: UserPreferencesSchema.optional(),
}).refine(
  data => Object.keys(data).length > 0,
  'At least one field must be provided'
);
```

---

## API Documentation (OpenAPI/Swagger)

### Swagger Integration

**Configuration:**
```typescript
// backend/src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AVES API',
      version: '1.0.0',
      description: 'Visual Spanish Bird Learning Platform API',
    },
    servers: [
      { url: 'http://localhost:3001/api/v1', description: 'Development' },
      { url: 'https://api.aves.example.com/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
```

**Route Documentation:**
```typescript
/**
 * @openapi
 * /annotations:
 *   post:
 *     summary: Create a new annotation
 *     tags: [Annotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - speciesId
 *               - featureType
 *               - boundingBox
 *             properties:
 *               speciesId:
 *                 type: string
 *                 format: uuid
 *               featureType:
 *                 type: string
 *                 enum: [anatomy, color, behavior]
 *               boundingBox:
 *                 type: object
 *                 properties:
 *                   x: { type: integer }
 *                   y: { type: integer }
 *                   width: { type: integer }
 *                   height: { type: integer }
 *     responses:
 *       201:
 *         description: Annotation created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/annotations', validate(CreateAnnotationSchema), async (req, res) => {
  // ...
});
```

**Swagger UI:**
```typescript
// backend/src/index.ts
import { specs, swaggerUi } from '@/config/swagger';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
// Access at: http://localhost:3001/api/docs
```

---

## Frontend API Client

### Type-Safe API Client

```typescript
// frontend/src/services/apiClient.ts
import axios from 'axios';
import type { CreateAnnotationData } from '@shared/types/annotation.types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const annotationsApi = {
  create: (data: CreateAnnotationData) =>
    apiClient.post('/annotations', data),

  list: (speciesId: string) =>
    apiClient.get(`/species/${speciesId}/annotations`),

  delete: (id: string) =>
    apiClient.delete(`/annotations/${id}`),
};
```

**Usage in Components:**
```typescript
// Frontend component
import { annotationsApi } from '@/services/apiClient';

async function createAnnotation() {
  try {
    const { data } = await annotationsApi.create({
      speciesId: 'species-123',
      featureType: 'anatomy',
      boundingBox: { x: 10, y: 20, width: 50, height: 50 },
    });
    // data is typed automatically
    console.log('Created annotation:', data.id);
  } catch (error) {
    if (error.response?.status === 400) {
      // Validation error
      console.error('Validation failed:', error.response.data.details);
    }
  }
}
```

---

## API Versioning Strategy

### Versioning Approach

**URL-based versioning:**
```
/api/v1/species
/api/v2/species
```

**Deprecation Headers:**
```typescript
res.set('X-API-Version', '1');
res.set('X-API-Deprecated', 'false');
res.set('X-API-Sunset', '2026-12-31'); // If deprecated
```

**Migration Path:**
1. Release v2 with new features
2. Mark v1 endpoints as deprecated (X-API-Deprecated header)
3. Set sunset date (6 months notice)
4. Monitor v1 usage
5. Remove v1 after sunset date

---

## Security Considerations

### Input Validation

**Prevent Injection:**
```typescript
const SafeStringSchema = z.string()
  .trim()
  .max(1000)
  .refine(val => !/<script|javascript:/i.test(val), 'Invalid characters');
```

**File Upload Validation:**
```typescript
const ImageUploadSchema = z.object({
  file: z.instanceof(Buffer),
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().max(5 * 1024 * 1024), // 5MB max
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api/', apiLimiter);
```

---

## Related Decisions

- **ADR-007:** Authentication Flow (JWT in API)
- **ADR-001:** Monorepo Structure (shared types)

---

## References

- [REST API Design](https://restfulapi.net/)
- [Zod Documentation](https://zod.dev/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2025-11-27 | Backend Team | Accepted | REST + Zod selected |
| 2025-12-04 | Documentation Engineer | Documented | ADR created |

---

**Last Updated:** 2025-12-04
**Status:** ✅ Implemented and Operational
**API Version:** v1
**Endpoints:** 45+ endpoints
**Validation Overhead:** ~1-2ms per request
