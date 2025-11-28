# AVES API Documentation

## Overview

The AVES backend API is now fully documented using OpenAPI 3.0 (Swagger) specification.

## Accessing the Documentation

### Development (Local)
- **Swagger UI**: http://localhost:3001/api/docs
- **OpenAPI JSON**: http://localhost:3001/api/docs.json

### Production (Railway)
- **Swagger UI**: https://aves-backend-production.up.railway.app/api/docs
- **OpenAPI JSON**: https://aves-backend-production.up.railway.app/api/docs.json

## Documentation Structure

### Files Added

1. **`backend/src/config/swagger.ts`**
   - OpenAPI 3.0 configuration
   - API metadata (title, version, description)
   - Server definitions (local + production)
   - Security schemes (JWT Bearer authentication)
   - Reusable component schemas (User, Species, Annotation, etc.)
   - Tag definitions for route grouping

2. **`backend/src/routes/docs.ts`**
   - Swagger UI setup at `/api/docs`
   - OpenAPI JSON endpoint at `/api/docs.json`
   - Custom UI configuration (theme, persistence, filters)

### Routes with JSDoc Annotations

The following endpoints now have complete OpenAPI documentation:

#### Authentication (`/api/auth`)
- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification (documented inline)

#### Species (`/api/species`)
- ✅ `GET /api/species` - List all species with annotation counts
- `GET /api/species/:id` - Get species details
- `GET /api/species/search` - Search species
- `GET /api/species/stats` - Species statistics

#### AI Annotations (`/api/ai/annotations`)
- ✅ `POST /api/ai/annotations/generate/:imageId` - Generate AI annotations
- `GET /api/ai/annotations/pending` - List pending annotations
- `GET /api/ai/annotations/stats` - Review statistics
- `GET /api/ai/annotations/:jobId` - Get job status
- `POST /api/ai/annotations/:annotationId/approve` - Approve annotation
- `POST /api/ai/annotations/:annotationId/reject` - Reject annotation
- `PATCH /api/ai/annotations/:annotationId` - Edit annotation

#### Exercises (`/api/exercises`)
- ✅ `POST /api/exercises/session/start` - Start exercise session
- `POST /api/exercises/result` - Record exercise result
- `GET /api/exercises/session/:sessionId/progress` - Get session progress
- ✅ `GET /api/exercises/difficult-terms` - Get challenging vocabulary

## API Tags

Routes are organized by the following tags:

- **Authentication**: User registration, login, token verification
- **Species**: Bird species information and statistics
- **Images**: Image upload and management
- **Annotations**: Manual annotation creation/management
- **AI Annotations**: AI-powered annotation generation and review
- **Exercises**: Interactive learning exercises and progress tracking
- **Vocabulary**: Vocabulary enrichment and progressive disclosure
- **Analytics**: Learning analytics and performance metrics
- **Health**: System health and status endpoints

## Security

### JWT Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

**Token Lifetime**: 24 hours

**Obtaining a Token**:
1. Register: `POST /api/auth/register`
2. Login: `POST /api/auth/login`

Both endpoints return:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Rate Limiting

- **General API**: 100 requests per 15 minutes
- **AI Generation**: 50 requests per hour (resource-intensive)

## Component Schemas

The following reusable schemas are defined:

### Core Types
- **User**: User account information
- **AuthResponse**: Login/register response with token
- **Species**: Bird species details (bilingual)
- **BoundingBox**: Normalized coordinates (0-1)
- **Annotation**: Manual or AI-generated annotation
- **AIAnnotationJob**: Async AI generation job

### Validation
- **Error**: Standard error response format

## Example Usage

### 1. Register and Login

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### 2. List Species

```bash
curl http://localhost:3001/api/species
```

### 3. Generate AI Annotations (Admin)

```bash
curl -X POST http://localhost:3001/api/ai/annotations/generate/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "imageUrl": "https://storage.example.com/birds/mallard.jpg"
  }'
```

### 4. Start Exercise Session

```bash
curl -X POST http://localhost:3001/api/exercises/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_123"
  }'
```

## Interactive Testing

The Swagger UI at `/api/docs` provides:

- **Try it out**: Execute requests directly from the browser
- **Authorization**: Persistent JWT token storage
- **Request/Response Examples**: See expected formats
- **Validation**: Real-time schema validation
- **Filtering**: Search endpoints by tag or path

## Development

### Adding New Endpoints

To document a new endpoint:

1. **Add JSDoc Comment** in the route file:

```typescript
/**
 * @openapi
 * /api/your-endpoint:
 *   post:
 *     tags:
 *       - YourTag
 *     summary: Brief description
 *     description: Detailed description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/your-endpoint', async (req, res) => {
  // Implementation
});
```

2. **Add Component Schema** (if needed) in `backend/src/config/swagger.ts`:

```typescript
YourSchema: {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' }
  }
}
```

3. **Restart Server**: Changes are auto-detected by swagger-jsdoc

## Deployment

The documentation is automatically deployed with the backend:

- **Railway**: Available at production URL + `/api/docs`
- **No Build Step Required**: Swagger spec is generated at runtime
- **Environment-Aware**: Server URLs adapt to deployment environment

## Next Steps

### Remaining Endpoints to Document

The following routes still need JSDoc annotations (prioritized by usage):

1. **High Priority**:
   - `GET /api/species/:id`
   - `POST /api/exercises/result`
   - `GET /api/exercises/session/:sessionId/progress`

2. **Medium Priority**:
   - Image upload endpoints
   - Annotation CRUD endpoints
   - Vocabulary enrichment endpoints

3. **Low Priority**:
   - Analytics endpoints
   - Admin-only endpoints
   - Debug/diagnostic endpoints

### Improvements

- [ ] Add request/response examples for all endpoints
- [ ] Document query parameters for pagination/filtering
- [ ] Add error response examples (400, 401, 404, 500)
- [ ] Create Postman collection export
- [ ] Set up automatic schema validation tests

## References

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express Documentation](https://github.com/scottie1984/swagger-ui-express)

---

**Last Updated**: November 27, 2025
**API Version**: 1.0.0
