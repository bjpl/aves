# Security Documentation

## Overview

This document outlines the comprehensive security measures implemented in the AVES application. The application follows security best practices and implements defense-in-depth strategies to protect against common vulnerabilities.

## Table of Contents

1. [Security Layers](#security-layers)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [Rate Limiting](#rate-limiting)
5. [Security Headers](#security-headers)
6. [Encryption & Data Protection](#encryption--data-protection)
7. [Logging & Monitoring](#logging--monitoring)
8. [Environment Configuration](#environment-configuration)
9. [Security Best Practices](#security-best-practices)
10. [Incident Response](#incident-response)

---

## Security Layers

The application implements multiple security layers:

1. **Network Layer**: HTTPS enforcement, HSTS, secure connections
2. **Application Layer**: Input validation, rate limiting, CORS
3. **Authentication Layer**: JWT tokens, password hashing, session management
4. **Data Layer**: Parameterized queries, encryption at rest
5. **Monitoring Layer**: Request logging, security audit trails, anomaly detection

---

## Authentication & Authorization

### JWT Authentication

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Token Types**:
  - Access Token: Short-lived (24 hours default)
  - Refresh Token: Long-lived (7 days default)
- **Security Features**:
  - Cryptographically signed tokens
  - Token expiration validation
  - Issuer validation
  - Secure token storage recommendations

### Password Security

- **Hashing**: bcrypt with configurable rounds (10 minimum, 12 recommended)
- **Password Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Protection Against**:
  - Rainbow table attacks (via salt)
  - Brute force attacks (via bcrypt work factor)
  - Timing attacks (via constant-time comparison)

### Configuration

```env
JWT_SECRET=<strong-random-secret-32-chars-minimum>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

**CRITICAL**: Generate secrets using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Input Validation & Sanitization

### Validation

All user inputs are validated using Zod schemas before processing.

**Features**:
- Type validation
- Format validation (email, URL, UUID, etc.)
- Length validation
- Custom validation rules
- Automatic error messages

**Example**:
```typescript
import { validateRequest, commonSchemas } from './middleware/inputValidation';

const loginSchema = {
  body: z.object({
    email: commonSchemas.email,
    password: z.string().min(1),
  }),
};

app.post('/login', validateRequest(loginSchema), loginHandler);
```

### Sanitization

All string inputs are automatically sanitized to prevent XSS attacks.

**Protection Against**:
- Cross-Site Scripting (XSS)
- SQL Injection
- Script injection
- HTML injection

**Methods**:
- HTML entity encoding
- Script tag removal
- Special character escaping
- Recursive object sanitization

### Configuration

```env
ENABLE_INPUT_VALIDATION=true
ENABLE_INPUT_SANITIZATION=true
ENABLE_HTML_SANITIZATION=true
BLOCK_MALICIOUS_INPUT=true
```

---

## Rate Limiting

Multiple rate limiting strategies protect against abuse and DoS attacks.

### Rate Limit Tiers

1. **General API**: 100 requests per 15 minutes
2. **Authentication Endpoints**: 5 attempts per 15 minutes
3. **Authenticated API**: 60 requests per minute
4. **File Upload**: 10 uploads per minute
5. **AI Services**: 20 requests per minute

### Features

- IP-based rate limiting
- User-based rate limiting (for authenticated requests)
- Configurable windows and limits
- Automatic retry headers
- Whitelisting support
- Sliding window algorithm

### Configuration

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_STRICT_WINDOW_MS=900000
RATE_LIMIT_STRICT_MAX_REQUESTS=5
RATE_LIMIT_API_WINDOW_MS=60000
RATE_LIMIT_API_MAX_REQUESTS=60
```

### Whitelist IPs

```env
RATE_LIMIT_WHITELIST_IPS=192.168.1.1,10.0.0.1
RATE_LIMIT_UNLIMITED_KEYS=<api-key-1>,<api-key-2>
```

---

## Security Headers

Comprehensive security headers are automatically applied to all responses.

### Implemented Headers

1. **HSTS (HTTP Strict Transport Security)**
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```

2. **CSP (Content Security Policy)**
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self'; ...
   ```

3. **X-Frame-Options**
   ```
   X-Frame-Options: DENY
   ```

4. **X-Content-Type-Options**
   ```
   X-Content-Type-Options: nosniff
   ```

5. **X-XSS-Protection**
   ```
   X-XSS-Protection: 1; mode=block
   ```

6. **Referrer-Policy**
   ```
   Referrer-Policy: strict-origin-when-cross-origin
   ```

7. **Permissions-Policy**
   ```
   Permissions-Policy: geolocation=(), microphone=(), camera=()
   ```

8. **Cross-Origin Policies**
   ```
   Cross-Origin-Embedder-Policy: require-corp
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Resource-Policy: same-origin
   ```

### Configuration

```env
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=true
CSP_ENABLED=true
CSP_REPORT_ONLY=false
X_FRAME_OPTIONS=DENY
REFERRER_POLICY=strict-origin-when-cross-origin
```

---

## Encryption & Data Protection

### Data in Transit

- **TLS 1.3**: Enforced in production
- **HTTPS Redirect**: Automatic HTTP to HTTPS redirect
- **Certificate Validation**: Strict certificate validation

### Data at Rest

- **Database Encryption**: SSL/TLS connections to database
- **Password Hashing**: bcrypt with salt
- **Sensitive Data**: Never logged or exposed in errors

### Secrets Management

**NEVER commit secrets to version control!**

Recommended approaches:
1. Environment variables
2. AWS Secrets Manager
3. HashiCorp Vault
4. Azure Key Vault
5. Docker secrets

### Configuration

```env
DB_SSL_ENABLED=true
DB_SSL_CA=/path/to/ca-certificate.crt
FORCE_HTTPS=true
SECURE_COOKIES=true
```

---

## Logging & Monitoring

### Request Logging

All requests are logged with the following information:
- Timestamp
- HTTP method and path
- Status code
- Response time
- IP address
- User agent
- Request/response size

### Sensitive Data Sanitization

The following data is automatically redacted from logs:
- Passwords
- Tokens (JWT, API keys, etc.)
- Authorization headers
- Cookies
- Credit card numbers
- SSN
- Any field matching sensitive patterns

### Security Audit Logging

Security-relevant events are logged:
- Failed authentication attempts
- Rate limit violations
- Suspicious input patterns
- SQL injection attempts
- XSS attempts
- Authorization failures

### Configuration

```env
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_REQUESTS=true
LOG_SANITIZE=true
```

### Log Levels

- `trace`: Very detailed debugging
- `debug`: Debugging information
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Critical failures

---

## Environment Configuration

### Required Environment Variables

**Production Requirements**:
```env
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
SESSION_SECRET=<strong-random-secret>
DB_SSL_ENABLED=true
FORCE_HTTPS=true
SECURE_COOKIES=true
```

**Development Settings**:
```env
NODE_ENV=development
JWT_SECRET=<any-value-for-development>
DEV_AUTH_BYPASS=false  # Only enable for testing
VERBOSE_ERRORS=true
```

### Configuration Validation

The application validates configuration on startup:
- JWT secret strength (32+ characters in production)
- No weak/default secrets in production
- Required environment variables present
- Security features enabled in production

**Startup will fail if critical security requirements are not met!**

---

## Security Best Practices

### For Developers

1. **Never hardcode secrets**
   ```typescript
   // ❌ Bad
   const apiKey = "sk_1234567890";

   // ✅ Good
   const apiKey = process.env.API_KEY;
   ```

2. **Always validate input**
   ```typescript
   // ❌ Bad
   const userId = req.params.id;

   // ✅ Good
   const userId = validateRequest({ params: z.object({ id: commonSchemas.id }) });
   ```

3. **Use parameterized queries**
   ```typescript
   // ❌ Bad
   const query = `SELECT * FROM users WHERE id = ${userId}`;

   // ✅ Good
   const query = 'SELECT * FROM users WHERE id = $1';
   const result = await db.query(query, [userId]);
   ```

4. **Sanitize output**
   ```typescript
   // ❌ Bad
   res.json({ message: userInput });

   // ✅ Good
   res.json({ message: sanitizeString(userInput) });
   ```

5. **Handle errors securely**
   ```typescript
   // ❌ Bad
   res.status(500).json({ error: err.stack });

   // ✅ Good
   res.status(500).json({
     error: 'Internal server error',
     ...(process.env.NODE_ENV === 'development' && { details: err.message })
   });
   ```

### For Operations

1. **Regular Security Updates**
   - Update dependencies monthly
   - Monitor security advisories
   - Apply patches promptly

2. **Secrets Rotation**
   - Rotate JWT secrets quarterly
   - Rotate API keys when team members leave
   - Use secrets manager for automated rotation

3. **Monitoring**
   - Set up alerts for rate limit violations
   - Monitor failed authentication attempts
   - Review security logs weekly

4. **Backups**
   - Regular database backups
   - Encrypted backup storage
   - Test restore procedures

5. **Access Control**
   - Principle of least privilege
   - Regular access reviews
   - Multi-factor authentication for admin access

---

## Incident Response

### Security Incident Procedure

1. **Detection**
   - Monitor logs for anomalies
   - Set up automated alerts
   - Review security dashboard

2. **Containment**
   - Isolate affected systems
   - Block malicious IPs
   - Rotate compromised credentials

3. **Investigation**
   - Review audit logs
   - Identify attack vector
   - Assess damage

4. **Recovery**
   - Restore from backups if needed
   - Apply security patches
   - Update security rules

5. **Post-Incident**
   - Document incident
   - Update security procedures
   - Conduct post-mortem

### Contact Information

**Security Team**: security@aves.example.com

**Report Security Vulnerabilities**:
Please report security vulnerabilities via email, not through public issues.

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets are environment-based
- [ ] JWT secret is strong (32+ characters)
- [ ] Database SSL is enabled
- [ ] HTTPS is enforced
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Input validation is enabled
- [ ] Logging is configured
- [ ] Security headers are enabled
- [ ] Dependencies are up to date
- [ ] Security scan completed (npm audit)

### Post-Deployment

- [ ] HTTPS certificate is valid
- [ ] Security headers are present (check with securityheaders.com)
- [ ] Rate limiting is working
- [ ] Logs are being collected
- [ ] Monitoring alerts are configured
- [ ] Backup system is operational
- [ ] Incident response plan is documented

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## Compliance

This security implementation addresses requirements for:
- OWASP Top 10
- GDPR (data protection)
- PCI DSS (if handling payments)
- SOC 2 (security controls)

---

## Version History

- **v1.0.0** (2025-11-03): Initial security documentation
  - Comprehensive security middleware implementation
  - Input validation and sanitization
  - Advanced rate limiting
  - Security headers
  - Logging with sanitization

---

## License

This security documentation is part of the AVES project and follows the same license terms.
