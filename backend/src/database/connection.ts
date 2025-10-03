import { Pool } from 'pg';
import dotenv from 'dotenv';
import { info, error as logError } from '../utils/logger';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aves',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logError('Unexpected error on idle client', err);
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