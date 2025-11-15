/**
 * Development-Only Authentication Bypass
 *
 * SECURITY WARNING: This middleware bypasses authentication for development/testing.
 * NEVER use in production! Always check NODE_ENV before enabling.
 */

import { Request, Response, NextFunction } from 'express';
import { info } from '../utils/logger';

/**
 * Development bypass middleware
 * Uses service role key or bypasses auth completely in development
 */
export const devAuthBypass = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // STRICT: Only allow in development AND never in production
  if (process.env.NODE_ENV === 'production') {
    // In production, this middleware should never bypass auth
    next();
    return;
  }

  if (process.env.NODE_ENV !== 'development') {
    next();
    return;
  }

  // Check if bypass is explicitly enabled
  const bypassEnabled = process.env.DEV_AUTH_BYPASS === 'true';

  // Extra safety: Refuse to bypass if production-like indicators are present
  if (process.env.DATABASE_URL?.includes('prod') ||
      process.env.SUPABASE_URL?.includes('prod') ||
      process.env.FORCE_HTTPS === 'true') {
    info('⚠️ Production indicators detected - auth bypass refused');
    next();
    return;
  }

  if (bypassEnabled) {
    info('🔓 DEV AUTH BYPASS ACTIVE', {
      path: req.path,
      method: req.method,
      warning: 'Authentication bypassed for development'
    });

    // Inject a fake admin user
    req.user = {
      userId: 'a54c117d-07b8-46f8-b86d-ee77af616f6e', // Real admin user ID from your DB
      email: 'admin@aves.test'
    };

    // Skip to next middleware (bypassing auth)
    next();
    return;
  }

  // If bypass not enabled, continue to normal auth
  next();
};