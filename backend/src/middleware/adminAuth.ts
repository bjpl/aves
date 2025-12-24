/**
 * Admin Authentication Middleware
 * Ensures user has admin or moderator role
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../database/connection';
import { error as logError } from '../utils/logger';

/**
 * Middleware to check if authenticated user has admin role
 * Requires authenticateToken middleware to run first
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Query user role from database
    const query = 'SELECT role FROM users WHERE id = $1';
    const result = await pool.query(query, [req.user.userId]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const userRole = result.rows[0].role;

    // Check if user has admin or moderator role
    if (userRole !== 'admin' && userRole !== 'moderator') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin or moderator access required'
      });
      return;
    }

    // User is authorized, proceed
    next();
  } catch (error) {
    logError('Admin authorization error', error as Error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Middleware to check if user has strict admin role (not moderator)
 */
export const requireStrictAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const query = 'SELECT role FROM users WHERE id = $1';
    const result = await pool.query(query, [req.user.userId]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const userRole = result.rows[0].role;

    if (userRole !== 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
      return;
    }

    next();
  } catch (error) {
    logError('Strict admin authorization error', error as Error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};
