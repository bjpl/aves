/**
 * Global Test Teardown
 * Ensures all database connections and worker processes are properly cleaned up
 */

module.exports = async () => {
  console.log('Starting global test teardown...');

  // Step 1: Cleanup batch processor and any active workers
  try {
    // Import and cleanup batch processor (stops rate limiter timers)
    const { cleanupBatchProcessor } = await import('../routes/batch');
    if (typeof cleanupBatchProcessor === 'function') {
      cleanupBatchProcessor();
      console.log('✓ Batch processor cleaned up');
    }
  } catch (err) {
    console.warn('Batch processor cleanup skipped:', (err as Error).message);
  }

  // Step 1b: Cleanup admin image management (stops cleanupOldJobs timer)
  try {
    const { cleanupAdminImageManagement } = await import('../routes/adminImageManagement');
    if (typeof cleanupAdminImageManagement === 'function') {
      cleanupAdminImageManagement();
      console.log('✓ Admin image management cleaned up');
    }
  } catch (err) {
    console.warn('Admin image management cleanup skipped:', (err as Error).message);
  }

  // Step 2: Force clear all Jest timers to prevent hanging
  if (typeof jest !== 'undefined') {
    jest.clearAllTimers();
    jest.clearAllMocks();
  }

  // Step 3: Close main database pool (imported on demand to avoid initialization issues)
  try {
    const { pool } = await import('../database/connection');
    await pool.end();
    console.log('✓ Main database pool closed');
  } catch (err) {
    console.warn('Main pool cleanup warning:', (err as Error).message);
  }

  // Step 4: Close test pool if it exists
  try {
    const { testPool } = await import('./integration/setup');
    if (testPool && typeof testPool.end === 'function') {
      await testPool.end();
      console.log('✓ Test database pool closed');
    }
  } catch (err) {
    console.warn('Test pool cleanup warning:', (err as Error).message);
  }

  // Step 5: Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('✓ Garbage collection triggered');
  }

  console.log('✓ Global test teardown complete');
};
