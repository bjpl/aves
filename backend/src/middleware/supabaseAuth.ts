import logger from '../utils/logger';
/**
 * Supabase Authentication Middleware
 *
 * CONCEPT: Validates Supabase JWT tokens for API authentication
 * WHY: Frontend uses Supabase auth, backend needs to verify those tokens
 * PATTERN: Express middleware that validates JWT and attaches user to request
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { info, error as logError } from '../utils/logger';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error({
        SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'Set' : 'Missing',
        NODE_ENV: process.env.NODE_ENV,
        All_ENV_KEYS: Object.keys(process.env).filter(key => key.startsWith('SUPABASE') || key === 'NODE_ENV')
      }, 'Environment variables');
      throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
}

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware: Authenticate request using Supabase JWT
 *
 * Extracts JWT from Authorization header, validates it with Supabase,
 * and attaches user info to req.user
 */
export const authenticateSupabaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Development bypass for testing
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      info('🔓 Development auth bypass enabled', { path: req.path });
      req.user = {
        userId: 'dev-admin-user',
        email: 'admin@aves.test'
      };
      next();
      return;
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      info('No auth token provided', { path: req.path });
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify JWT with Supabase
    const { data: { user }, error } = await getSupabaseClient().auth.getUser(token);

    if (error || !user) {
      logError('Invalid Supabase token', error || new Error('No user returned'));
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email || ''
    };

    info('Supabase auth successful', {
      userId: user.id,
      email: user.email,
      path: req.path
    });

    next();

  } catch (err) {
    logError('Supabase auth middleware error', err as Error);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
};

/**
 * Middleware: Require admin role
 *
 * Checks if authenticated user has admin privileges.
 * Must be used AFTER authenticateSupabaseToken.
 */
export const requireSupabaseAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Development bypass for testing
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      info('🔓 Development admin bypass enabled', {
        userId: req.user.userId,
        path: req.path
      });
      next();
      return;
    }

    // Check admin status in user_metadata or app_metadata
    const { data: { user }, error } = await getSupabaseClient().auth.admin.getUserById(req.user.userId);

    if (error || !user) {
      logError('Failed to get user admin status', error || new Error('No user found'));
      res.status(403).json({ error: 'Admin access denied' });
      return;
    }

    // Check for admin role in metadata
    const isAdmin =
      user.app_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      info('Non-admin user attempted admin action', {
        userId: req.user.userId,
        path: req.path
      });
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    info('Admin access granted', {
      userId: req.user.userId,
      path: req.path
    });

    next();

  } catch (err) {
    logError('Admin check middleware error', err as Error);
    res.status(500).json({ error: 'Authorization check failed' });
    return;
  }
};
