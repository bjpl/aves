/**
 * API Key Authentication Middleware
 * Provides API key-based authentication for external services
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { warn, error as logError } from '../utils/logger';

/**
 * API Key format: aves_<environment>_<random_32_chars>
 * Example: aves_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 */

/**
 * Extended Request with API key info
 */
export interface ApiKeyRequest extends Request {
  apiKey?: {
    key: string;
    environment: string;
    permissions: string[];
  };
}

/**
 * In-memory API key store (replace with database in production)
 */
const apiKeyStore = new Map<string, {
  name: string;
  permissions: string[];
  rateLimit?: number;
  createdAt: Date;
  lastUsedAt?: Date;
}>();

/**
 * Hash API key for secure storage
 */
function hashApiKey(apiKey: string): string {
  const secret = process.env.API_KEY_SECRET || 'default-secret-change-in-production';
  return crypto
    .createHmac('sha256', secret)
    .update(apiKey)
    .digest('hex');
}

/**
 * Generate a new API key
 */
export function generateApiKey(environment: 'dev' | 'prod' | 'test' = 'dev'): string {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `aves_${environment}_${randomPart}`;
}

/**
 * Validate API key format
 */
function isValidApiKeyFormat(apiKey: string): boolean {
  const pattern = /^aves_(dev|prod|test)_[a-f0-9]{32}$/;
  return pattern.test(apiKey);
}

/**
 * Extract API key from request
 */
function extractApiKey(req: Request): string | null {
  // Check header (preferred)
  const headerName = process.env.API_KEY_HEADER || 'X-API-Key';
  let apiKey = req.headers[headerName.toLowerCase()] as string;

  if (apiKey) {
    return apiKey.trim();
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim();
    if (isValidApiKeyFormat(apiKey)) {
      return apiKey;
    }
  }

  // Check query parameter (less secure, not recommended)
  if (process.env.API_KEY_ALLOW_QUERY === 'true') {
    apiKey = req.query.api_key as string;
    if (apiKey) {
      warn('API key provided in query parameter (insecure)', {
        path: req.path,
        ip: req.ip,
      });
      return apiKey.trim();
    }
  }

  return null;
}

/**
 * Verify API key
 */
async function verifyApiKey(apiKey: string): Promise<{
  valid: boolean;
  data?: {
    name: string;
    permissions: string[];
    rateLimit?: number;
  };
}> {
  if (!isValidApiKeyFormat(apiKey)) {
    return { valid: false };
  }

  const hashedKey = hashApiKey(apiKey);
  const keyData = apiKeyStore.get(hashedKey);

  if (!keyData) {
    return { valid: false };
  }

  // Update last used timestamp
  keyData.lastUsedAt = new Date();
  apiKeyStore.set(hashedKey, keyData);

  return {
    valid: true,
    data: {
      name: keyData.name,
      permissions: keyData.permissions,
      rateLimit: keyData.rateLimit,
    },
  };
}

/**
 * API key authentication middleware
 */
export function requireApiKey(options: {
  required?: boolean;
  permissions?: string[];
} = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { required = true, permissions = [] } = options;

    try {
      const apiKey = extractApiKey(req);

      if (!apiKey) {
        if (required) {
          res.status(401).json({
            error: 'Authentication required',
            message: 'API key is missing. Please provide a valid API key.',
          });
          return;
        }
        return next();
      }

      const verification = await verifyApiKey(apiKey);

      if (!verification.valid) {
        warn('Invalid API key attempt', {
          path: req.path,
          ip: req.ip,
          apiKeyPrefix: apiKey.substring(0, 10) + '...',
        });

        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid API key.',
        });
        return;
      }

      // Check permissions if required
      if (permissions.length > 0 && verification.data) {
        const hasPermission = permissions.every((perm) =>
          verification.data!.permissions.includes(perm)
        );

        if (!hasPermission) {
          warn('Insufficient API key permissions', {
            path: req.path,
            required: permissions,
            has: verification.data.permissions,
          });

          res.status(403).json({
            error: 'Forbidden',
            message: 'API key does not have required permissions.',
            required: permissions,
          });
          return;
        }
      }

      // Attach API key info to request
      (req as ApiKeyRequest).apiKey = {
        key: apiKey,
        environment: apiKey.split('_')[1],
        permissions: verification.data?.permissions || [],
      };

      next();
    } catch (error) {
      logError('API key authentication error', error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to authenticate API key.',
      });
    }
  };
}

/**
 * Create a new API key
 */
export function createApiKey(options: {
  name: string;
  environment?: 'dev' | 'prod' | 'test';
  permissions?: string[];
  rateLimit?: number;
}): string {
  const {
    name,
    environment = 'dev',
    permissions = [],
    rateLimit,
  } = options;

  const apiKey = generateApiKey(environment);
  const hashedKey = hashApiKey(apiKey);

  apiKeyStore.set(hashedKey, {
    name,
    permissions,
    rateLimit,
    createdAt: new Date(),
  });

  return apiKey;
}

/**
 * Revoke an API key
 */
export function revokeApiKey(apiKey: string): boolean {
  const hashedKey = hashApiKey(apiKey);
  return apiKeyStore.delete(hashedKey);
}

/**
 * List all API keys (without revealing the actual keys)
 */
export function listApiKeys(): Array<{
  name: string;
  environment: string;
  permissions: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}> {
  const keys: Array<any> = [];

  apiKeyStore.forEach((value, key) => {
    keys.push({
      name: value.name,
      environment: 'unknown', // Would need to store this separately
      permissions: value.permissions,
      createdAt: value.createdAt,
      lastUsedAt: value.lastUsedAt,
    });
  });

  return keys;
}

/**
 * Initialize API key authentication
 */
export function initializeApiKeyAuth(): void {
  // Load API keys from environment or database
  const defaultApiKey = process.env.DEFAULT_API_KEY;

  if (defaultApiKey && isValidApiKeyFormat(defaultApiKey)) {
    const hashedKey = hashApiKey(defaultApiKey);
    apiKeyStore.set(hashedKey, {
      name: 'Default API Key',
      permissions: ['*'], // All permissions
      createdAt: new Date(),
    });
  }

  console.log('API key authentication initialized');
}

export default {
  requireApiKey,
  generateApiKey,
  createApiKey,
  revokeApiKey,
  listApiKeys,
  initializeApiKeyAuth,
};
