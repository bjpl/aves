import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Sentry Configuration for Error Monitoring
 *
 * Initializes Sentry error tracking with optional DSN.
 * If SENTRY_DSN is not set, Sentry will not be initialized
 * and the application will continue to work normally.
 *
 * Environment Variables:
 * - SENTRY_DSN: Sentry Data Source Name (required for Sentry to work)
 * - NODE_ENV: Environment name (development, staging, production)
 * - SENTRY_ENVIRONMENT: Optional override for environment name
 * - SENTRY_TRACES_SAMPLE_RATE: Sample rate for performance monitoring (0.0 to 1.0)
 */

// Track if Sentry is initialized
let sentryInitialized = false;

/**
 * Initialize Sentry error monitoring
 *
 * Call this BEFORE any other imports or middleware in your Express app.
 * This ensures Sentry can properly instrument your application.
 */
export function initializeSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

  // Skip initialization if DSN is not provided
  if (!dsn) {
    logger.info('Sentry DSN not configured - error monitoring disabled (this is OK for development)');
    return;
  }

  try {
    // Configure sample rates based on environment
    const isProduction = environment === 'production';
    const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
      ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : (isProduction ? 0.1 : 1.0); // 10% in production, 100% in dev/staging

    Sentry.init({
      dsn,
      environment,

      // Performance monitoring
      tracesSampleRate,

      // Error sample rate (always 100% - we want all errors)
      sampleRate: 1.0,

      // Enable source maps for better stack traces
      // Integrations are automatically configured by Sentry SDK v8+

      // Release tracking (useful for correlating errors with deployments)
      release: process.env.npm_package_version,

      // Additional context
      beforeSend(event, hint) {
        // Add custom context or filter events here if needed
        const error = hint.originalException;

        // Log to console in development for debugging
        if (environment === 'development') {
          logger.debug({
            message: event.message,
            error: error instanceof Error ? error.message : String(error)
          }, 'Sentry event captured');
        }

        return event;
      },

      // Don't send errors in test environment
      enabled: process.env.NODE_ENV !== 'test',
    });

    sentryInitialized = true;
    logger.info({
      environment,
      tracesSampleRate,
      release: process.env.npm_package_version || 'unknown'
    }, 'Sentry initialized successfully');
  } catch (error) {
    // Don't let Sentry initialization failures crash the app
    logger.error({ error }, 'Failed to initialize Sentry');
    sentryInitialized = false;
  }
}

/**
 * Sentry request handler middleware
 *
 * Add this EARLY in your middleware chain, before any route handlers.
 * This enables Sentry to capture request context for error reports.
 *
 * @example
 * app.use(sentryRequestHandler);
 * app.use('/api', apiRoutes);
 */
export function sentryRequestHandler(req: Request, res: Response, next: NextFunction): void {
  // Sentry v8+ automatically instruments Express via the init() call
  // This is a no-op placeholder for backward compatibility
  next();
}

/**
 * Sentry tracing middleware
 *
 * Add this after request handler to enable performance monitoring.
 *
 * @example
 * app.use(sentryRequestHandler);
 * app.use(sentryTracingHandler);
 * app.use('/api', apiRoutes);
 */
export function sentryTracingHandler(req: Request, res: Response, next: NextFunction): void {
  // Tracing is handled automatically by Sentry v8+
  next();
}

/**
 * Sentry error handler middleware
 *
 * Add this BEFORE your custom error handler but AFTER all routes.
 * This captures errors and sends them to Sentry.
 *
 * @example
 * app.use('/api', apiRoutes);
 * app.use(sentryErrorHandler);
 * app.use(customErrorHandler);
 */
export function sentryErrorHandler(err: unknown, _req: Request, _res: Response, next: NextFunction): void {
  if (!sentryInitialized) {
    return next(err);
  }

  // Only report server errors (5xx) to Sentry
  // Client errors (4xx) are expected and shouldn't be reported
  const statusCode = (err as { status?: number }).status || 500;

  if (statusCode >= 500) {
    Sentry.captureException(err);
  }

  next(err);
}

/**
 * Manual error capture
 *
 * Use this to manually report errors to Sentry with additional context.
 *
 * @param error - The error to report
 * @param context - Additional context to include in the error report
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureSentryError(error, {
 *     userId: req.user?.id,
 *     operation: 'riskyOperation',
 *     additionalData: { foo: 'bar' }
 *   });
 *   throw error; // Re-throw if needed
 * }
 */
export function captureSentryError(
  error: Error | unknown,
  context?: {
    userId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
  }
): void {
  if (!sentryInitialized) {
    // Sentry not initialized - just log locally
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      context
    }, 'Error captured (Sentry not initialized)');
    return;
  }

  // Set user context if provided
  if (context?.userId) {
    Sentry.setUser({ id: context.userId });
  }

  // Set tags for filtering in Sentry UI
  if (context?.tags) {
    Sentry.setTags(context.tags);
  }

  // Set extra context data
  if (context?.extra) {
    Sentry.setExtras(context.extra);
  }

  // Capture the error
  Sentry.captureException(error, {
    level: context?.level || 'error'
  });

  // Clear context after capture
  Sentry.setUser(null);
}

/**
 * Capture a message (non-error event)
 *
 * Use this to report informational messages or warnings to Sentry.
 *
 * @param message - The message to report
 * @param level - Severity level (info, warning, error, etc.)
 * @param context - Additional context
 *
 * @example
 * captureSentryMessage('Payment processing took longer than expected', 'warning', {
 *   extra: { duration: 5000, threshold: 2000 }
 * });
 */
export function captureSentryMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): void {
  if (!sentryInitialized) {
    const logFn = level === 'error' ? logger.error : logger.info;
    logFn({ context }, message);
    return;
  }

  if (context?.tags) {
    Sentry.setTags(context.tags);
  }

  if (context?.extra) {
    Sentry.setExtras(context.extra);
  }

  Sentry.captureMessage(message, level);
  Sentry.setUser(null);
}

/**
 * Check if Sentry is initialized
 *
 * Useful for conditional logic based on Sentry availability.
 */
export function isSentryEnabled(): boolean {
  return sentryInitialized;
}

/**
 * Express middleware to add user context to Sentry
 *
 * Add this AFTER authentication middleware to automatically include
 * user information in error reports.
 *
 * @example
 * app.use(authMiddleware);
 * app.use(sentryUserContext);
 */
export function sentryUserContext(req: Request, _res: Response, next: NextFunction): void {
  if (sentryInitialized && req.user) {
    Sentry.setUser({
      id: (req.user as { id?: string }).id,
      email: (req.user as { email?: string }).email,
      username: (req.user as { username?: string }).username,
    });
  }
  next();
}

// Export Sentry instance for advanced usage
export { Sentry };
