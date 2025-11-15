import { Pool } from 'pg';
import { info, error as logError, warn } from '../utils/logger';

/**
 * Optimized Database Connection Pool
 *
 * Performance Improvements:
 * - Configurable min/max connections for better resource management
 * - Statement and query timeouts to prevent long-running queries
 * - Connection validation and monitoring
 * - Environment-based configuration for different deployment scenarios
 */

// Use DATABASE_URL if available (Railway/Heroku style), otherwise use individual vars
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // SSL is required for Supabase connections
      ssl: process.env.DB_SSL_ENABLED !== 'false' ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'aves',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      // SSL Configuration
      ssl: process.env.DB_SSL_ENABLED === 'true'
        ? {
            rejectUnauthorized: false, // Supabase uses self-signed certs
            ca: process.env.DB_SSL_CA,
          }
        : false,
    };

export const pool = new Pool({
  ...connectionConfig,

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
  allowExitOnIdle: process.env.DB_ALLOW_EXIT_ON_IDLE === 'true',
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
    // Log connection attempt details for debugging
    info('Attempting database connection', {
      host: process.env.DATABASE_URL ? '[Using DATABASE_URL]' : (process.env.DB_HOST || 'localhost'),
      database: process.env.DB_NAME || 'aves',
      ssl: process.env.DATABASE_URL ? 'enabled' : (process.env.DB_SSL_ENABLED || 'false'),
      NODE_ENV: process.env.NODE_ENV || 'not set',
      hasDBUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_URL
    });

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