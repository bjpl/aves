import { Pool } from 'pg';
import dotenv from 'dotenv';
import { info, error as logError, warn } from '../utils/logger';

dotenv.config();

/**
 * Optimized Database Connection Pool
 *
 * Performance Improvements:
 * - Configurable min/max connections for better resource management
 * - Statement and query timeouts to prevent long-running queries
 * - Connection validation and monitoring
 * - Environment-based configuration for different deployment scenarios
 */
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aves',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',

  // SSL Configuration - Enable in production for encrypted connections
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL_ENABLED === 'true'
    ? {
        rejectUnauthorized: true, // Require valid SSL certificate
        ca: process.env.DB_SSL_CA, // Optional: Certificate authority
      }
    : false, // Disable SSL in development

  // Connection Pool Size
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '5'),

  // Timeouts
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,

  // Query Timeouts (prevent long-running queries)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '10000'), // 10 seconds
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '10000'), // 10 seconds

  // Connection Management
  allowExitOnIdle: false,
});

// ============================================================================
// Connection Pool Monitoring
// ============================================================================

let connectionCount = 0;
let errorCount = 0;
let lastErrorTime: Date | null = null;

pool.on('error', (err, client) => {
  errorCount++;
  lastErrorTime = new Date();
  logError('Unexpected error on idle client', err);

  // Warn if error rate is high
  if (errorCount > 10) {
    warn('High database error rate detected', { errorCount, lastErrorTime });
  }
});

pool.on('connect', (client) => {
  connectionCount++;
  info('New database connection established', {
    totalConnections: connectionCount,
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('acquire', (client) => {
  // Track connection acquisition for debugging
  if (process.env.DB_DEBUG === 'true') {
    info('Client acquired from pool', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    });
  }
});

pool.on('remove', (client) => {
  info('Client removed from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount
  });
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    info('Database connected successfully', { timestamp: result.rows[0].now });
    return true;
  } catch (err) {
    logError('Database connection failed', err as Error);
    return false;
  }
};