/**
 * Security Configuration Module
 * Centralized security configuration and constants
 */

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  // JWT Configuration
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
    issuer: string;
  };

  // Password Security
  password: {
    bcryptRounds: number;
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };

  // Session Configuration
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };

  // Rate Limiting
  rateLimit: {
    general: {
      windowMs: number;
      maxRequests: number;
    };
    auth: {
      windowMs: number;
      maxRequests: number;
    };
    api: {
      windowMs: number;
      maxRequests: number;
    };
  };

  // CORS Configuration
  cors: {
    allowedOrigins: string[];
    credentials: boolean;
    maxAge: number;
    allowedMethods: string[];
    allowedHeaders: string[];
  };

  // File Upload
  upload: {
    maxFileSize: number;
    maxFilesPerRequest: number;
    allowedMimeTypes: string[];
    uploadDir: string;
  };

  // Security Headers
  headers: {
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    csp: {
      enabled: boolean;
      reportOnly: boolean;
      reportUri?: string;
    };
    xFrameOptions: 'DENY' | 'SAMEORIGIN';
    xContentTypeOptions: boolean;
    xXssProtection: boolean;
    referrerPolicy: string;
  };

  // Feature Flags
  features: {
    forceHttps: boolean;
    trustProxy: boolean;
    secureCookies: boolean;
    devAuthBypass: boolean;
  };
}

/**
 * Load security configuration from environment
 */
export function loadSecurityConfig(): SecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    jwt: {
      secret: process.env.JWT_SECRET || '',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      algorithm: 'HS256',
      issuer: 'aves-api',
    },

    password: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },

    session: {
      secret: process.env.SESSION_SECRET || '',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'),
      secure: isProduction || process.env.SECURE_COOKIES === 'true',
      httpOnly: true,
      sameSite: isProduction ? 'strict' : 'lax',
    },

    rateLimit: {
      general: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      },
      auth: {
        windowMs: parseInt(process.env.RATE_LIMIT_STRICT_WINDOW_MS || '900000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_STRICT_MAX_REQUESTS || '5'),
      },
      api: {
        windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_API_MAX_REQUESTS || '60'),
      },
    },

    cors: {
      allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
        .split(',')
        .filter(Boolean),
      credentials: process.env.CORS_CREDENTIALS !== 'false',
      maxAge: parseInt(process.env.CORS_MAX_AGE || '86400'),
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    },

    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
      maxFilesPerRequest: parseInt(process.env.MAX_FILES_PER_REQUEST || '5'),
      allowedMimeTypes: (
        process.env.ALLOWED_FILE_TYPES ||
        'image/jpeg,image/png,image/gif,image/webp'
      ).split(','),
      uploadDir: process.env.UPLOAD_DIR || './uploads',
    },

    headers: {
      hsts: {
        enabled: process.env.HSTS_ENABLED !== 'false',
        maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
        includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
        preload: process.env.HSTS_PRELOAD !== 'false',
      },
      csp: {
        enabled: process.env.CSP_ENABLED !== 'false',
        reportOnly: process.env.CSP_REPORT_ONLY === 'true',
        reportUri: process.env.CSP_REPORT_URI,
      },
      xFrameOptions: (process.env.X_FRAME_OPTIONS === 'SAMEORIGIN'
        ? 'SAMEORIGIN'
        : 'DENY') as 'DENY' | 'SAMEORIGIN',
      xContentTypeOptions: true,
      xXssProtection: true,
      referrerPolicy: process.env.REFERRER_POLICY || 'strict-origin-when-cross-origin',
    },

    features: {
      forceHttps: isProduction || process.env.FORCE_HTTPS === 'true',
      trustProxy: process.env.TRUST_PROXY === 'true',
      secureCookies: isProduction || process.env.SECURE_COOKIES === 'true',
      devAuthBypass:
        !isProduction && process.env.DEV_AUTH_BYPASS === 'true',
    },
  };
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): void {
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Validate JWT secret
  if (!config.jwt.secret) {
    errors.push('JWT_SECRET is required');
  } else if (isProduction && config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production');
  }

  // Validate session secret
  if (config.session.secret && config.session.secret.length < 32) {
    errors.push('SESSION_SECRET should be at least 32 characters');
  }

  // Validate bcrypt rounds
  if (config.password.bcryptRounds < 10) {
    errors.push('BCRYPT_ROUNDS should be at least 10 for security');
  }

  // Validate CORS origins
  if (config.cors.allowedOrigins.length === 0) {
    errors.push('At least one CORS origin must be configured');
  }

  // Production-specific validations
  if (isProduction) {
    if (!config.features.forceHttps) {
      console.warn('⚠️  Warning: FORCE_HTTPS is disabled in production');
    }

    if (!config.features.secureCookies) {
      console.warn('⚠️  Warning: SECURE_COOKIES is disabled in production');
    }

    if (!config.headers.hsts.enabled) {
      console.warn('⚠️  Warning: HSTS is disabled in production');
    }

    if (config.features.devAuthBypass) {
      errors.push('DEV_AUTH_BYPASS must be disabled in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Security configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Security constants
 */
export const SECURITY_CONSTANTS = {
  // Minimum password length
  MIN_PASSWORD_LENGTH: 8,

  // Maximum password length
  MAX_PASSWORD_LENGTH: 128,

  // JWT token types
  TOKEN_TYPES: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },

  // Session cookie name
  SESSION_COOKIE_NAME: 'aves_session',

  // CSRF token header
  CSRF_TOKEN_HEADER: 'x-csrf-token',

  // API key header
  API_KEY_HEADER: 'x-api-key',

  // Rate limit headers
  RATE_LIMIT_HEADERS: {
    LIMIT: 'X-RateLimit-Limit',
    REMAINING: 'X-RateLimit-Remaining',
    RESET: 'X-RateLimit-Reset',
  },

  // Security header values
  SECURITY_HEADERS: {
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
  },

  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

  // Request body limits
  MAX_REQUEST_BODY_SIZE: 10 * 1024 * 1024, // 10MB
};

/**
 * Get security config instance
 */
let securityConfigInstance: SecurityConfig | null = null;

export function getSecurityConfig(): SecurityConfig {
  if (!securityConfigInstance) {
    securityConfigInstance = loadSecurityConfig();
    validateSecurityConfig(securityConfigInstance);
  }
  return securityConfigInstance;
}

export default {
  loadSecurityConfig,
  validateSecurityConfig,
  getSecurityConfig,
  SECURITY_CONSTANTS,
};
