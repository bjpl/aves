/**
 * Frontend Logger Utility
 *
 * Provides structured logging with environment-based configuration.
 * Uses pino for high-performance logging with browser console formatting.
 */

import pino from 'pino';

// Determine log level based on environment
const getLogLevel = (): pino.Level => {
  const env = import.meta.env.MODE;

  if (env === 'production' || env === 'gh-pages') {
    return 'error'; // Only errors in production
  }

  if (env === 'test') {
    return 'silent'; // Silent during tests
  }

  return 'debug'; // Full logging in development
};

// Browser console transport for better formatting
const browserTransport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: 'pid,hostname',
    singleLine: false,
  },
});

// Create logger instance
const logger = pino({
  level: getLogLevel(),
  browser: {
    asObject: true,
    serialize: true,
  },
  base: {
    env: import.meta.env.MODE,
  },
}, browserTransport);

/**
 * Create a child logger with additional context
 *
 * @param context - Additional context to include in all logs
 * @returns Child logger instance
 */
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

/**
 * Log an informational message
 *
 * @param message - Message to log
 * @param context - Optional context object
 */
export const info = (message: string, context?: Record<string, unknown>) => {
  logger.info(context || {}, message);
};

/**
 * Log a warning message
 *
 * @param message - Message to log
 * @param context - Optional context object
 */
export const warn = (message: string, context?: Record<string, unknown>) => {
  logger.warn(context || {}, message);
};

/**
 * Log an error message
 *
 * @param message - Message to log
 * @param error - Error object or context
 */
export const error = (message: string, error?: Error | Record<string, unknown>) => {
  if (error instanceof Error) {
    logger.error({ err: error, stack: error.stack }, message);
  } else {
    logger.error(error || {}, message);
  }
};

/**
 * Log a debug message (only in development)
 *
 * @param message - Message to log
 * @param context - Optional context object
 */
export const debug = (message: string, context?: Record<string, unknown>) => {
  logger.debug(context || {}, message);
};

/**
 * Log a trace message (very verbose, only in development)
 *
 * @param message - Message to log
 * @param context - Optional context object
 */
export const trace = (message: string, context?: Record<string, unknown>) => {
  logger.trace(context || {}, message);
};

// Export the base logger for advanced use cases
export default logger;
