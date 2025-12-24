/**
 * AI Annotations Main Router
 * Combines all AI annotation sub-routers into a single cohesive API
 */

import { Router, Request, Response } from 'express';
import { info } from '../../utils/logger';
import generateRoutes from './generate.routes';
import reviewRoutes from './review.routes';
import batchRoutes from './batch.routes';
import statsRoutes from './stats.routes';
import patternsRoutes from './patterns.routes';

const router = Router();

// Debug middleware to log all requests to this router
router.use((req: Request, res: Response, next) => {
  info('AI Annotations Router Request', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
  next();
});

// Mount sub-routers
// NOTE: Order matters! More specific routes should be mounted first

// 1. Stats routes (must come BEFORE generate routes to avoid /stats being caught by /:jobId)
router.use('/ai/annotations', statsRoutes);

// 2. Pattern learning routes
router.use('/ai/annotations/patterns', patternsRoutes);

// 3. Batch operations
router.use('/ai/annotations/batch', batchRoutes);

// 4. Generation routes (includes /:jobId and /pending)
router.use('/ai/annotations', generateRoutes);

// 5. Review routes (approve, reject, edit)
router.use('/ai/annotations', reviewRoutes);

export default router;
