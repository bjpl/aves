import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import annotationsRouter from './routes/annotations';
import vocabularyRouter from './routes/vocabulary';
import exercisesRouter from './routes/exercises';
import speciesRouter from './routes/species';
import imagesRouter from './routes/images';
import { testConnection } from './database/connection';
import { error as logError, info } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', authRouter);
app.use('/api', annotationsRouter);
app.use('/api', vocabularyRouter);
app.use('/api', exercisesRouter);
app.use('/api', speciesRouter);
app.use('/api', imagesRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Request error', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    logError('Failed to connect to database. Server will start but database operations will fail.');
  }

  app.listen(PORT, () => {
    info(`Server started on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });
};

startServer().catch((err) => logError('Failed to start server', err));