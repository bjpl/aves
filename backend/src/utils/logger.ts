/**
 * Backend Logger Utility
 *
 * Provides structured logging with environment-based configuration.
 * Uses pino for high-performance logging with optional pretty printing.
 */

import pino from 'pino';
import { config } from 'dotenv';

config();

// Determine log level based on environment
const getLogLevel = (): pino.LevelWithSilent => {
  const env = process.env.NODE_ENV;

  if (env === 'production') {
    return 'info'; // Info and above in production
  }

  if (env === 'test') {
    return 'silent'; // Silent during tests
  }

  return 'debug'; // Full logging in development
};

// Pretty printing options for development
const prettyPrintOptions = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'HH:MM:ss.l',
    ignore: 'pid,hostname',
    singleLine: false,
    messageFormat: '{levelLabel} - {msg}',
  },
};

// Create logger instance with appropriate transport
const logger = pino({
  level: getLogLevel(),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
}, process.env.NODE_ENV !== 'production' ? pino.transport(prettyPrintOptions) : undefined);

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
 * @param context - Additional context (only used when error is an Error)
 */
export const error = (
  message: string,
  error?: Error | Record<string, unknown>,
  context?: Record<string, unknown>
) => {
  if (error instanceof Error) {
    logger.error({ err: error, stack: error.stack, ...(context || {}) }, message);
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

/**
 * Create HTTP request logger middleware
 * Compatible with Express.js
 */
export const httpLogger = () => {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      }, `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });

    next();
  };
};

// Export the base logger for advanced use cases
export default logger;
