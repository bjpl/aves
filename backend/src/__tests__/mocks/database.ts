/**
 * Mock database connections for unit tests
 * Prevents actual database connections during testing
 */

export const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};

export const mockTestPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};

// Mock the database connection module
jest.mock('../../database/connection', () => ({
  pool: mockPool,
  testPool: mockTestPool,
  getPool: jest.fn(() => mockPool),
  executeQuery: jest.fn(),
  executeTransaction: jest.fn(),
}));

// Mock pg module entirely
jest.mock('pg', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };

  return {
    Pool: jest.fn(() => mockPool),
    Client: jest.fn(() => mockClient),
  };
});