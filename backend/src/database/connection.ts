import logger from '../utils/logger';
import { Pool } from 'pg';
import { info, error as logError, warn } from '../utils/logger';
import { createRailwayConnection } from './railway-connection';

/**
 * Optimized Database Connection Pool
 *
 * Performance Improvements:
 * - Configurable min/max connections for better resource management
 * - Statement and query timeouts to prevent long-running queries
 * - Connection validation and monitoring
 * - Environment-based configuration for different deployment scenarios
 */

// SECURITY: Use DATABASE_URL exclusively - no hardcoded credentials
// All connection details must come from environment variables
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // SSL configuration for Supabase (handles both direct and pooled connections)
      ssl: process.env.DATABASE_URL.includes('pooler.supabase.com')
        ? { rejectUnauthorized: false } // Pooled connections handle SSL differently
        : process.env.DB_SSL_ENABLED !== 'false'
          ? { rejectUnauthorized: false }
          : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'aves',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      // SSL Configuration
      ssl: process.env.DB_SSL_ENABLED === 'true'
        ? {
            rejectUnauthorized: false, // Supabase uses self-signed certs
            ca: process.env.DB_SSL_CA,
          }
        : false,
    };

// Validate required credentials in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
    throw new Error('FATAL: DATABASE_URL or DB_PASSWORD required in production');
  }
}

// Initialize pool with default config (may be replaced by Railway connection)
export let pool = new Pool({
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

// Check if we're on Railway
const isRailway = !!process.env.RAILWAY_ENVIRONMENT;

export const testConnection = async (): Promise<boolean> => {
  try {
    // Use Railway-specific connection in production on Railway
    if (isRailway && process.env.NODE_ENV === 'production') {
      logger.info('Detected Railway environment - using multi-strategy connection...');
      const railwayPool = await createRailwayConnection();

      if (railwayPool) {
        // Replace the default pool with the working Railway pool
        pool = railwayPool;
        return true;
      }

      logError('Railway connection strategies all failed');
      return false;
    }

    // Original connection logic for non-Railway environments
    const dbUrl = process.env.DATABASE_URL || '';
    const isPooled = dbUrl.includes('pooler.supabase.com');
    const connectionInfo = {
      host: process.env.DATABASE_URL ? '[Using DATABASE_URL]' : (process.env.DB_HOST || 'localhost'),
      database: process.env.DB_NAME || 'aves',
      ssl: process.env.DATABASE_URL ? 'enabled' : (process.env.DB_SSL_ENABLED || 'false'),
      NODE_ENV: process.env.NODE_ENV || 'not set',
      hasDBUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      isPooledConnection: isPooled,
      urlPreview: dbUrl ? `${dbUrl.substring(0, 40)}...` : 'not set'
    };

    logger.info('Database connection attempt:', connectionInfo);
    info('Attempting database connection', connectionInfo);

    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    info('Database connected successfully', { timestamp: result.rows[0].now });
    return true;
  } catch (err) {
    const error = err as any;
    logger.error('Database connection failed with error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      hostname: error.hostname,
      port: error.port,
      database: error.database
    });
    logError('Database connection failed', error);
    return false;
  }
};