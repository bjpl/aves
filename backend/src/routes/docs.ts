/**
 * API Documentation Routes
 * Serves Swagger UI and OpenAPI specification
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';

const router = Router();

// Serve OpenAPI JSON spec at /api/docs.json
router.get('/docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Swagger UI at /api/docs
router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AVES API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true, // Remember auth token across page refreshes
      displayRequestDuration: true,
      filter: true, // Enable filtering by tags/paths
      syntaxHighlight: {
        theme: 'monokai'
      }
    }
  })
);

export default router;
