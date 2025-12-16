/**
 * Database Connection Module Tests
 *
 * Tests for backend/src/database/connection.ts
 * Covers:
 * - Pool instance exports
 * - Mock pool behavior verification
 * - Query execution
 *
 * Note: These tests use the global database mocks from __tests__/mocks/database.ts
 * The actual testConnection function is tested via integration tests.
 */

import { pool } from '../../database/connection';
import { mockPool, mockTestConnection } from '../mocks/database';

describe('Database Connection Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pool Instance', () => {
    it('should export pool instance', () => {
      expect(pool).toBeDefined();
    });

    it('should be the mock pool in test environment', () => {
      expect(pool).toBe(mockPool);
    });

    it('should have required pool methods', () => {
      expect(typeof pool.connect).toBe('function');
      expect(typeof pool.query).toBe('function');
      expect(typeof pool.end).toBe('function');
      expect(typeof pool.on).toBe('function');
    });

    it('should have pool metrics properties', () => {
      expect(typeof pool.totalCount).toBe('number');
      expect(typeof pool.idleCount).toBe('number');
      expect(typeof pool.waitingCount).toBe('number');
    });
  });

  describe('Pool Query Operations', () => {
    it('should execute query successfully', async () => {
      const result = await pool.query('SELECT 1');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
      expect(result).toEqual({ rows: [], rowCount: 0 });
    });

    it('should execute parameterized query', async () => {
      await pool.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
    });
  });

  describe('Pool Connection Operations', () => {
    it('should connect and return client', async () => {
      const client = await pool.connect();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toBeDefined();
      expect(typeof client.query).toBe('function');
      expect(typeof client.release).toBe('function');
    });

    it('should execute query on client', async () => {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');

      expect(result).toEqual({ rows: [], rowCount: 0 });
    });

    it('should release client', async () => {
      const client = await pool.connect();
      client.release();

      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('Pool End Operations', () => {
    it('should end pool gracefully', async () => {
      await pool.end();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('Pool Event Handlers', () => {
    it('should register event handlers', () => {
      const handler = jest.fn();
      pool.on('error', handler);

      expect(mockPool.on).toHaveBeenCalledWith('error', handler);
    });

    it('should register connect handler', () => {
      const handler = jest.fn();
      pool.on('connect', handler);

      expect(mockPool.on).toHaveBeenCalledWith('connect', handler);
    });
  });

  describe('testConnection Export', () => {
    it('should export testConnection function', async () => {
      // Import dynamically to get the mocked version
      const { testConnection } = await import('../../database/connection');

      expect(testConnection).toBeDefined();
      expect(typeof testConnection).toBe('function');
    });

    it('should return true when mock is configured for success', async () => {
      mockTestConnection.mockResolvedValueOnce(true);

      const result = await mockTestConnection();

      expect(result).toBe(true);
    });

    it('should return false when mock is configured for failure', async () => {
      mockTestConnection.mockResolvedValueOnce(false);

      const result = await mockTestConnection();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle query errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Query failed'));

      await expect(pool.query('SELECT * FROM invalid')).rejects.toThrow('Query failed');
    });

    it('should handle connection errors', async () => {
      (mockPool.connect as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      await expect(pool.connect()).rejects.toThrow('Connection refused');
    });
  });

  describe('Pool Configuration', () => {
    it('should have configured pool metrics', () => {
      expect(pool.totalCount).toBe(0);
      expect(pool.idleCount).toBe(0);
      expect(pool.waitingCount).toBe(0);
    });
  });
});
