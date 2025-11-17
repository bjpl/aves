/**
 * Optional Supabase Authentication Middleware
 *
 * This middleware allows requests to proceed even without authentication,
 * but will validate and attach user info if a token is provided.
 * Useful for development and initial setup.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { info, warn, error as logError } from '../utils/logger';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      warn('Supabase not configured - authentication will be bypassed', {
        SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'Set' : 'Missing'
      });
      return null;
    }

    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } catch (err) {
      logError('Failed to initialize Supabase client', err as Error);
      return null;
    }
  }
  return supabase;
}

/**
 * Optional authentication middleware - validates token if present,
 * but allows requests to proceed even without authentication
 */
export const optionalSupabaseAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      info('No auth token provided - proceeding without authentication', { path: req.path });
      // Set a default user for development
      req.user = {
        userId: 'anonymous',
        email: 'anonymous@aves.app'
      };
      next();
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      warn('Supabase not configured - using anonymous user', { path: req.path });
      req.user = {
        userId: 'anonymous',
        email: 'anonymous@aves.app'
      };
      next();
      return;
    }

    // Try to verify JWT with Supabase
    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      warn('Invalid token provided - proceeding as anonymous', {
        error: error?.message,
        path: req.path
      });
      req.user = {
        userId: 'anonymous',
        email: 'anonymous@aves.app'
      };
    } else {
      req.user = {
        userId: user.id,
        email: user.email || ''
      };
      info('Authenticated user', {
        userId: user.id,
        email: user.email,
        path: req.path
      });
    }

    next();

  } catch (err) {
    logError('Error in optional auth middleware', err as Error);
    // Even on error, proceed with anonymous user
    req.user = {
      userId: 'anonymous',
      email: 'anonymous@aves.app'
    };
    next();
  }
};

/**
 * Optional admin check - logs warning but doesn't block
 */
export const optionalSupabaseAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || req.user.userId === 'anonymous') {
    warn('Admin action attempted by anonymous user', { path: req.path });
  }
  // Always proceed
  next();
};