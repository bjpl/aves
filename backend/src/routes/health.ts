/**
 * Health Check and Configuration Validation Endpoint
 */
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint with service configuration status
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: !!process.env.DATABASE_URL,
      supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      anthropicKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
      anthropicKeyPreview: process.env.ANTHROPIC_API_KEY
        ? `${process.env.ANTHROPIC_API_KEY.substring(0, 8)}...${process.env.ANTHROPIC_API_KEY.substring(process.env.ANTHROPIC_API_KEY.length - 4)}`
        : 'NOT_SET'
    },
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(health);
});

export default router;
