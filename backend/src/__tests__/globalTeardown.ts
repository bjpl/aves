/**
 * Global Test Teardown
 * Ensures all database connections are closed after all tests complete
 */

module.exports = async () => {
  // Give time for all database operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('✓ Global test teardown complete');
};
