import { Pool, PoolConfig } from 'pg';
import { info, error as logError } from '../utils/logger';

/**
 * Railway-specific database connection with multiple fallback strategies
 * Handles IPv6 issues and pooler authentication problems
 */

// Try multiple connection string formats
function getConnectionConfigs(): PoolConfig[] {
  const password = 'ymS5gBm9Wz9q1P11';
  const projectRef = 'ubqnfiwxghkxltluyczd';

  // Get the primary DATABASE_URL if set
  const primaryUrl = process.env.DATABASE_URL;

  const configs: PoolConfig[] = [];

  // 1. Try environment variable first
  if (primaryUrl) {
    configs.push({
      connectionString: primaryUrl,
      ssl: { rejectUnauthorized: false }
    });
  }

  // 2. Supavisor Session Mode (AWS pooler) - Format 1
  configs.push({
    connectionString: `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  });

  // 3. Supavisor Session Mode - Format 2 (alternative password placement)
  configs.push({
    connectionString: `postgresql://postgres:${password}.${projectRef}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  });

  // 4. Try with explicit user/host/database parameters (bypasses DNS)
  configs.push({
    host: 'aws-0-us-west-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  // 5. Transaction mode pooler (if other formats fail)
  configs.push({
    connectionString: `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false }
  });

  // 6. Direct connection with explicit IPv4 (last resort)
  configs.push({
    host: '54.185.141.40', // Hardcoded IPv4 for db.ubqnfiwxghkxltluyczd.supabase.co
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  return configs;
}

export async function createRailwayConnection(): Promise<Pool | null> {
  const configs = getConnectionConfigs();

  console.log(`Attempting to connect using ${configs.length} different configurations...`);

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const configDesc = config.connectionString
      ? `Config ${i + 1}: ${config.connectionString.substring(0, 50)}...`
      : `Config ${i + 1}: ${config.host}:${config.port}`;

    console.log(`Trying ${configDesc}`);

    const pool = new Pool({
      ...config,
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // Quick timeout to try next
      statement_timeout: 10000,
      query_timeout: 10000
    });

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      info(`✅ Database connected successfully using ${configDesc}`, {
        timestamp: result.rows[0].now
      });
      console.log(`SUCCESS: Connected using ${configDesc}`);
      return pool; // Return the working pool

    } catch (err: any) {
      console.log(`Failed ${configDesc}: ${err.message}`);
      await pool.end(); // Clean up failed pool
      // Continue to next configuration
    }
  }

  logError('All database connection attempts failed');
  return null;
}