import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports that might use them
// Load dotenv for local development
dotenv.config();

// Log environment detection for debugging
console.log('Starting server with environment:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3001,
  hasDBUrl: !!process.env.DATABASE_URL,
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
});

import authRouter from './routes/auth';
import annotationsRouter from './routes/annotations';
import aiAnnotationsRouter from './routes/aiAnnotations';
import aiExercisesRouter from './routes/aiExercises';
import vocabularyRouter from './routes/vocabulary';
import exercisesRouter from './routes/exercises';
import speciesRouter from './routes/species';
import imagesRouter from './routes/images';
import batchRouter from './routes/batch';
import mlAnalyticsRouter from './routes/mlAnalytics';
import feedbackAnalyticsRouter from './routes/feedbackAnalytics';
import annotationMasteryRouter from './routes/annotationMastery';
import adminImageManagementRouter from './routes/adminImageManagement';
import healthRouter from './routes/health';
import docsRouter from './routes/docs';
import { testConnection } from './database/connection';
import { error as logError, info } from './utils/logger';
import { devAuthBypass } from './middleware/devAuth';

/**
 * Validate production environment configuration
 * Ensures critical security settings are properly configured
 */
function validateProductionConfig(): void {
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET;

    // Check if JWT_SECRET is set
    if (!jwtSecret) {
      throw new Error(
        'FATAL: JWT_SECRET must be set in production environment. ' +
        'Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    // List of weak/default secrets that should never be used in production
    const weakSecrets = [
      'your-secret-key',
      'your-secret-key-here',
      'your-secret-key-here-change-in-production',
      'secret',
      'changeme',
      'change-this',
      'default',
      'test',
      'development',
      'jwt-secret',
      'jwt_secret',
      '12345',
      'password',
      'admin',
      'example'
    ];

    // Check if JWT_SECRET matches any weak secrets (case-insensitive)
    const secretLower = jwtSecret.toLowerCase();
    const matchedWeakSecret = weakSecrets.find(weak => secretLower.includes(weak));

    if (matchedWeakSecret) {
      throw new Error(
        `FATAL: JWT_SECRET contains weak/default value ('${matchedWeakSecret}'). ` +
        'In production, use a strong random secret (min 32 characters). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    // Check minimum length (at least 32 characters recommended for production)
    if (jwtSecret.length < 32) {
      throw new Error(
        `FATAL: JWT_SECRET must be at least 32 characters long in production (current: ${jwtSecret.length}). ` +
        'Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    info('✅ Production security validation passed', {
      jwtSecretLength: jwtSecret.length,
      nodeEnv: process.env.NODE_ENV
    });
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway/cloud deployments (required for rate limiting)
// Railway and other cloud platforms use reverse proxies
app.set('trust proxy', true);

// Security middleware with enhanced CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"], // Allow images from HTTPS sources
        connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration - Allow multiple origins for development and production
const allowedOrigins = [
  'http://localhost:5173',           // Local development (default Vite)
  'http://localhost:5180',           // Local development (custom Vite port)
  'http://localhost:3000',           // Alternative local port
  'http://localhost:8080',           // Docker nginx container
  'https://aves-frontend.vercel.app', // Vercel production
  'https://aves-frontend-production.up.railway.app', // Railway production
  'https://bjpl.github.io',          // GitHub Pages
  process.env.FRONTEND_URL          // Environment-specific URL
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log blocked origins for debugging
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id']
}));

// Rate limiting - Environment configurable
// Skip rate limiting for admin and annotation routes (authenticated routes have their own protection)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'), // Increased to 500 for heavy annotation work
  message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  validate: { trustProxy: false }, // Disable trust proxy validation (handled at infrastructure level)
  skip: (req) => {
    // Skip rate limiting for admin and annotation routes - they require authentication
    const skipPaths = ['/admin/', '/ai-annotations/', '/annotations/'];
    return skipPaths.some(path => req.path.startsWith(path));
  }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded images
import path from 'path';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
}));

// Development auth bypass (ONLY in development!)
if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
  info('⚠️  DEV AUTH BYPASS ENABLED - DO NOT USE IN PRODUCTION!');
  app.use('/api', devAuthBypass);
}

// Track database connection status for health checks
let dbConnectionStatus: 'pending' | 'connected' | 'failed' = 'pending';

// Health check - responds immediately even before DB connects
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbConnectionStatus
  });
});

// Environment diagnostic endpoint (remove in production)
app.get('/api/env-check', (_req, res) => {
  res.json({
    status: 'checking environment variables',
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      PORT: process.env.PORT || 'not set',
      hasDatabase: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        DB_HOST: !!process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME || 'not set',
      },
      hasSupabase: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      hasAuth: {
        JWT_SECRET: !!process.env.JWT_SECRET,
        SESSION_SECRET: !!process.env.SESSION_SECRET,
      },
      railwayInfo: {
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
        RAILWAY_PROJECT_ID: !!process.env.RAILWAY_PROJECT_ID,
        RAILWAY_SERVICE_ID: !!process.env.RAILWAY_SERVICE_ID,
      },
      timestamp: new Date().toISOString()
    }
  });
});

// API routes
app.use('/api/health', healthRouter);
app.use('/api', docsRouter); // API documentation (Swagger UI)
app.use('/api', authRouter);

// Admin routes - mount early to avoid conflicts with other routers
app.use('/api', adminImageManagementRouter);

app.use('/api', annotationsRouter);
app.use('/api', aiAnnotationsRouter);
app.use('/api', aiExercisesRouter);
app.use('/api', vocabularyRouter);
app.use('/api', exercisesRouter);
app.use('/api', speciesRouter);
app.use('/api', imagesRouter);
app.use('/api', batchRouter);
app.use('/api', mlAnalyticsRouter);
app.use('/api', feedbackAnalyticsRouter);
app.use('/api', annotationMasteryRouter);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logError('Request error', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  // Validate production configuration before starting
  validateProductionConfig();

  // Start listening IMMEDIATELY so healthcheck passes
  // Database connection happens asynchronously
  app.listen(PORT, () => {
    info(`Server started on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });

    // Connect to database in background (non-blocking)
    testConnection()
      .then((connected) => {
        dbConnectionStatus = connected ? 'connected' : 'failed';
        if (!connected) {
          logError('Failed to connect to database. Server running but database operations will fail.');
        } else {
          info('Database connection established successfully');
        }
      })
      .catch((err) => {
        dbConnectionStatus = 'failed';
        logError('Database connection error', err);
      });
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  console.error('Full error details:', JSON.stringify(err, null, 2));
  logError('Failed to start server', err);
  // Exit with error code to trigger Railway to show logs
  process.exit(1);
});