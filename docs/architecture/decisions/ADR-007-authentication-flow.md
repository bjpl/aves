# ADR-007: Authentication Flow - Supabase Auth with JWT

**Status:** Accepted
**Date:** 2025-11-27
**Decision Makers:** Security Team, Backend Team
**Tags:** #security #authentication #jwt #supabase #auth

---

## Context

AVES requires secure user authentication for:

- **User Accounts:** Email/password registration and login
- **Session Management:** Persistent sessions across devices
- **API Security:** Protected endpoints for user data
- **Progressive Disclosure:** Track vocabulary progress per user
- **OAuth Future:** Support Google/GitHub sign-in (planned)

**Problem Statement:** What authentication system should we use to secure user accounts while maintaining developer experience and scalability?

**Constraints:**
- Must support email/password authentication
- Must integrate with existing PostgreSQL database
- Must provide JWT tokens for stateless API authentication
- Must support session refresh without re-login
- Should support OAuth providers (future)
- Must comply with educational platform security standards

---

## Decision

We will use **Supabase Auth** with **JWT-based authentication**.

**Authentication Flow:**

```
┌──────────────┐                          ┌───────────────┐
│   Frontend   │                          │   Supabase    │
│    Client    │                          │     Auth      │
└──────┬───────┘                          └───────┬───────┘
       │                                          │
       │  1. POST /auth/signup                    │
       │  { email, password }                     │
       ├─────────────────────────────────────────>│
       │                                          │
       │  2. Create user + Send verification      │
       │<─────────────────────────────────────────┤
       │                                          │
       │  3. User clicks verification link        │
       ├─────────────────────────────────────────>│
       │                                          │
       │  4. POST /auth/login                     │
       │  { email, password }                     │
       ├─────────────────────────────────────────>│
       │                                          │
       │  5. JWT + Refresh Token                  │
       │  { access_token, refresh_token }         │
       │<─────────────────────────────────────────┤
       │                                          │
       │  6. API Request                          │
       │  Authorization: Bearer <JWT>             │
       ├─────────────────────────────────────────>│
       │                                          │
       │  7. Validate JWT + Return data           │
       │<─────────────────────────────────────────┤
```

**Key Components:**

1. **Supabase Auth Service:** Handles user creation, login, sessions
2. **JWT Tokens:** Short-lived access tokens (1 hour default)
3. **Refresh Tokens:** Long-lived tokens (30 days) for renewal
4. **Row Level Security (RLS):** Database-level authorization
5. **Backend Middleware:** JWT validation for protected routes

---

## Consequences

### Positive

✅ **Built-in Authentication**
- No need to implement password hashing
- Email verification handled automatically
- Session management out of the box
- Reduces authentication code by ~80%

✅ **JWT-Based (Stateless)**
- No server-side session storage required
- Scalable across multiple backend instances
- Works with CDN/edge functions
- Fast validation (no database lookup)

✅ **Security Best Practices**
- Bcrypt password hashing (automatic)
- Rate limiting on login attempts
- Email verification flow
- Secure token generation (cryptographically secure)

✅ **Developer Experience**
- Simple SDK for frontend integration
- Automatic token refresh
- TypeScript support
- Built-in auth hooks (React)

✅ **Future-Ready**
- OAuth providers (Google, GitHub, etc.)
- Magic link authentication
- Multi-factor authentication (MFA)
- Single Sign-On (SSO)

### Negative

⚠️ **Vendor Lock-in**
- Tied to Supabase auth system
- Migration to different provider requires refactoring
- Custom auth logic limited

⚠️ **JWT Limitations**
- Cannot invalidate token before expiration (stateless)
- Larger payload than session IDs
- Must implement refresh token rotation for security

⚠️ **Token Expiration UX**
- Users logged out after access token expires
- Must handle token refresh gracefully
- Can be confusing for users

### Mitigations

1. **Automatic Token Refresh:**
```typescript
// Frontend: Automatically refresh tokens before expiration
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed:', session);
  }
});
```

2. **Graceful Logout on Invalid Token:**
```typescript
// Frontend: Handle 401 responses globally
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      supabase.auth.signOut();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

3. **Token Revocation List (Future):**
```typescript
// Backend: Maintain revoked token list in Redis
async function validateToken(token: string) {
  if (await redis.get(`revoked:${token}`)) {
    throw new Error('Token has been revoked');
  }
  return jwt.verify(token, secret);
}
```

---

## Alternatives Considered

### Alternative 1: Passport.js + Express-Session

**Pros:**
- Flexible (many strategies)
- Well-established in Express ecosystem
- Full control over authentication logic

**Cons:**
- Significant implementation effort
- Requires session storage (Redis/database)
- Must implement password hashing, email verification
- **Rejected because:** Too much boilerplate vs. Supabase Auth

### Alternative 2: Auth0

**Pros:**
- Enterprise-grade authentication
- Extensive OAuth provider support
- Advanced features (MFA, SSO)

**Cons:**
- Higher cost ($23/month minimum)
- External dependency (not integrated with database)
- More complex integration
- **Rejected because:** Cost and complexity for educational platform

### Alternative 3: Custom JWT Implementation

**Pros:**
- Complete control
- No vendor lock-in
- Minimal dependencies

**Cons:**
- Must implement password hashing, salting
- Email verification system required
- Token refresh logic complex
- **Rejected because:** Security risk (custom auth is hard to get right)

---

## Implementation Details

### Frontend Authentication

**Supabase Client Setup:**
```typescript
// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
```

**Sign Up:**
```typescript
// frontend/src/services/authService.ts
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;

  return data;
}
```

**Login:**
```typescript
export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // JWT stored in localStorage automatically
  return data;
}
```

**Logout:**
```typescript
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

**Get Current User:**
```typescript
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}
```

### Backend JWT Validation

**Middleware for Protected Routes:**
```typescript
// backend/src/middleware/supabaseAuth.ts
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side key
);

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
```

**Usage in Routes:**
```typescript
// backend/src/routes/vocabulary.ts
import { Router } from 'express';
import { authenticateUser } from '@/middleware/supabaseAuth';

const router = Router();

// Protected route
router.get(
  '/vocabulary/progress',
  authenticateUser, // Middleware validates JWT
  async (req, res) => {
    const userId = req.user.id; // User ID from JWT
    const progress = await getVocabularyProgress(userId);
    res.json(progress);
  }
);
```

### Optional Authentication

**Allow Public and Authenticated Access:**
```typescript
// backend/src/middleware/optionalAuth.ts
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');

    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      req.user = user || null;
    } catch (error) {
      req.user = null;
    }
  }

  next(); // Continue regardless of authentication
}
```

**Usage:**
```typescript
// Public species data, but personalized if logged in
router.get('/species/:id', optionalAuth, async (req, res) => {
  const species = await getSpecies(req.params.id);

  // Add favorite status if user is logged in
  if (req.user) {
    species.isFavorite = await checkFavorite(req.user.id, species.id);
  }

  res.json(species);
});
```

---

## Row Level Security (RLS) Integration

### Database-Level Authorization

**Example RLS Policy:**
```sql
-- Users can only access their own vocabulary progress
CREATE POLICY "user_vocab_access"
  ON user_vocabulary_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Frontend Query (Automatic RLS):**
```typescript
// RLS automatically filters results to current user
const { data: progress } = await supabase
  .from('user_vocabulary_progress')
  .select('*');
// Returns only rows where user_id = current user's ID
```

**Benefits:**
- Database enforces authorization (even if API compromised)
- No need to manually filter by user ID
- Protection against SQL injection attacks

---

## Token Lifecycle

### Access Token (JWT)

**Structure:**
```json
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1701388800,
  "exp": 1701392400
}
```

**Lifetime:** 1 hour (configurable)
**Storage:** Frontend localStorage (Supabase SDK manages this)
**Validation:** Backend verifies signature and expiration

### Refresh Token

**Lifetime:** 30 days (configurable)
**Storage:** Secure HTTP-only cookie (Supabase manages)
**Purpose:** Obtain new access token without re-login

**Automatic Refresh:**
```typescript
// Supabase SDK automatically refreshes tokens
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('New access token:', session.access_token);
  }
});
```

---

## Security Considerations

### Password Requirements

**Supabase Default:**
- Minimum 6 characters (can be increased)
- No complexity requirements by default

**Custom Validation (Frontend):**
```typescript
function validatePassword(password: string): boolean {
  // Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
}
```

### Email Verification

**Flow:**
1. User signs up → Supabase sends verification email
2. User clicks link → Email verified
3. User can now log in

**Enforcement:**
```typescript
// Backend: Check email verification
if (!req.user.email_confirmed_at) {
  return res.status(403).json({
    error: 'Email not verified. Please check your inbox.',
  });
}
```

### Rate Limiting

**Login Attempts:**
```typescript
// Supabase has built-in rate limiting
// Additional rate limiting at API level
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
});

router.post('/auth/login', loginLimiter, async (req, res) => {
  // Login logic
});
```

### Token Security

**Best Practices:**
- Access tokens in memory (managed by Supabase SDK)
- Refresh tokens in HTTP-only cookies
- No tokens in URL parameters
- HTTPS required for token transmission

---

## Error Handling

### Authentication Errors

```typescript
// Frontend: Handle auth errors gracefully
try {
  await supabase.auth.signInWithPassword({ email, password });
} catch (error) {
  if (error.message.includes('Invalid login credentials')) {
    showError('Incorrect email or password');
  } else if (error.message.includes('Email not confirmed')) {
    showError('Please verify your email before logging in');
  } else {
    showError('Login failed. Please try again.');
  }
}
```

### Token Expiration

```typescript
// Frontend: Automatically refresh on 401
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Try refreshing token
      const { data } = await supabase.auth.refreshSession();

      if (data.session) {
        // Retry original request with new token
        error.config.headers.Authorization = `Bearer ${data.session.access_token}`;
        return axios.request(error.config);
      } else {
        // Refresh failed, redirect to login
        await supabase.auth.signOut();
        router.push('/login');
      }
    }

    return Promise.reject(error);
  }
);
```

---

## OAuth Integration (Future)

### Google Sign-In

**Configuration:**
```typescript
// Frontend
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**Backend (Callback Handling):**
```typescript
router.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  // Supabase handles token exchange
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return res.redirect('/login?error=oauth_failed');
  }

  res.redirect('/dashboard');
});
```

---

## Related Decisions

- **ADR-003:** Database Architecture (RLS integration)
- **ADR-006:** Logging Strategy (audit logging)

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2025-11-27 | Security Team | Accepted | Supabase Auth selected |
| 2025-12-04 | Documentation Engineer | Documented | ADR created |

---

**Last Updated:** 2025-12-04
**Status:** ✅ Implemented and Operational
**Token Expiry:** 1 hour (access), 30 days (refresh)
**Security Audit:** Passed (November 2025)
