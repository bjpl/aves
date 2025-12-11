/**
 * Security Middleware
 * Comprehensive security middleware for Express applications
 * Implements defense-in-depth with multiple security layers
 */

import { Request, Response, NextFunction, Application } from 'express';
import helmet from 'helmet';
import { info, warn } from '../utils/logger';

/**
 * Security configuration interface
 */
interface SecurityConfig {
  csp: {
    enabled: boolean;
    reportOnly: boolean;
    reportUri?: string;
    directives: Record<string, unknown>;
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  frameguard: {
    action: 'deny' | 'sameorigin';
  };
}

/**
 * Get security configuration from environment
 */
function getSecurityConfig(): SecurityConfig {
  return {
    csp: {
      enabled: process.env.CSP_ENABLED !== 'false',
      reportOnly: process.env.CSP_REPORT_ONLY === 'true',
      reportUri: process.env.CSP_REPORT_URI,
      directives: {
        defaultSrc: [process.env.CSP_DEFAULT_SRC || "'self'"],
        scriptSrc: [process.env.CSP_SCRIPT_SRC || "'self'"],
        styleSrc: (process.env.CSP_STYLE_SRC || "'self'").split(','),
        imgSrc: (process.env.CSP_IMG_SRC || "'self',data:,https:").split(','),
        fontSrc: (process.env.CSP_FONT_SRC || "'self',data:").split(','),
        connectSrc: (process.env.CSP_CONNECT_SRC || "'self'").split(','),
        frameSrc: [process.env.CSP_FRAME_SRC || "'none'"],
        objectSrc: [process.env.CSP_OBJECT_SRC || "'none'"],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
      },
    },
    hsts: {
      enabled: process.env.HSTS_ENABLED !== 'false',
      maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
      includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
      preload: process.env.HSTS_PRELOAD !== 'false',
    },
    frameguard: {
      action: (process.env.X_FRAME_OPTIONS?.toLowerCase() === 'sameorigin'
        ? 'sameorigin'
        : 'deny') as 'deny' | 'sameorigin',
    },
  };
}

/**
 * Enhanced helmet configuration with environment-based settings
 */
export function getHelmetMiddleware() {
  const config = getSecurityConfig();

  const helmetConfig: Parameters<typeof helmet>[0] = {
    contentSecurityPolicy: config.csp.enabled
      ? {
          useDefaults: false,
          directives: config.csp.directives as Record<string, string[]>,
          reportOnly: config.csp.reportOnly,
        }
      : false,
    hsts: config.hsts.enabled
      ? {
          maxAge: config.hsts.maxAge,
          includeSubDomains: config.hsts.includeSubDomains,
          preload: config.hsts.preload,
        }
      : false,
    frameguard: {
      action: config.frameguard.action,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: (process.env.REFERRER_POLICY || 'strict-origin-when-cross-origin') as 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url',
    },
    hidePoweredBy: true,
    dnsPrefetchControl: {
      allow: false,
    },
    ieNoOpen: true,
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
  };

  return helmet(helmetConfig);
}

/**
 * Additional security headers not covered by helmet
 */
export function additionalSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent browser from inferring MIME type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Permissions Policy (formerly Feature Policy)
  const permissionsPolicy = [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', ');
  res.setHeader('Permissions-Policy', permissionsPolicy);

  // Cross-Origin Resource Policies
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Timing Information Protection
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
}

/**
 * Secure cookie configuration
 */
export function getSecureCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceSecure = process.env.SECURE_COOKIES === 'true';

  return {
    httpOnly: true,
    secure: isProduction || forceSecure,
    sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours default
    domain: process.env.COOKIE_DOMAIN,
    path: '/',
  };
}

/**
 * Force HTTPS redirect middleware (production only)
 */
export function forceHttps(req: Request, res: Response, next: NextFunction): void {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.FORCE_HTTPS === 'true' &&
    req.headers['x-forwarded-proto'] !== 'https' &&
    !req.secure
  ) {
    info('Redirecting HTTP to HTTPS', { originalUrl: req.originalUrl });
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
}

/**
 * Security audit logging middleware
 */
export function securityAuditLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log security-relevant events
  const securityHeaders = {
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
    origin: req.headers['origin'],
    xForwardedFor: req.headers['x-forwarded-for'],
    xRealIp: req.headers['x-real-ip'],
  };

  // Detect potentially suspicious patterns
  const suspiciousPatterns = [
    /union\s+select/i,
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /../,
    /\.\./,
  ];

  const requestPath = req.path.toLowerCase();
  const requestBody = JSON.stringify(req.body).toLowerCase();
  const requestQuery = JSON.stringify(req.query).toLowerCase();

  const isSuspicious = suspiciousPatterns.some((pattern) => {
    return (
      pattern.test(requestPath) ||
      pattern.test(requestBody) ||
      pattern.test(requestQuery)
    );
  });

  if (isSuspicious) {
    warn('Suspicious request detected', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      headers: securityHeaders,
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

/**
 * Request size limit validation
 */
export function validateRequestSize(maxSize: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      res.status(413).json({
        error: 'Request entity too large',
        maxSize: `${maxSize / (1024 * 1024)}MB`,
        receivedSize: `${contentLength / (1024 * 1024)}MB`,
      });
      return;
    }

    next();
  };
}

/**
 * Trusted proxy configuration
 */
export function configureTrustedProxy(app: Application): void {
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
    info('Trust proxy enabled');
  } else {
    info('Trust proxy disabled');
  }
}

/**
 * Security middleware bundle
 * Applies all security middleware in the correct order
 */
export function applySecurityMiddleware(app: Application): void {
  // 1. Force HTTPS (if enabled)
  if (process.env.FORCE_HTTPS === 'true') {
    app.use(forceHttps);
  }

  // 2. Helmet security headers
  app.use(getHelmetMiddleware());

  // 3. Additional security headers
  app.use(additionalSecurityHeaders);

  // 4. Security audit logging
  app.use(securityAuditLogger);

  // 5. Request size validation
  const maxSize = parseInt(
    process.env.MAX_REQUEST_BODY_SIZE?.replace(/[^0-9]/g, '') || '10485760'
  );
  app.use(validateRequestSize(maxSize));

  // 6. Configure trusted proxy
  configureTrustedProxy(app);

  info('Security middleware initialized', {
    nodeEnv: process.env.NODE_ENV,
    cspEnabled: process.env.CSP_ENABLED !== 'false',
    hstsEnabled: process.env.HSTS_ENABLED !== 'false',
    forceHttps: process.env.FORCE_HTTPS === 'true',
  });
}

export default {
  getHelmetMiddleware,
  additionalSecurityHeaders,
  getSecureCookieOptions,
  forceHttps,
  securityAuditLogger,
  validateRequestSize,
  configureTrustedProxy,
  applySecurityMiddleware,
};
