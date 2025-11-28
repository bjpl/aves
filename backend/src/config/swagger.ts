/**
 * OpenAPI 3.0 Swagger Configuration
 * Provides comprehensive API documentation for AVES backend
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AVES - Avian Visual Educational System API',
      version: '1.0.0',
      description: `
        # AVES API Documentation

        AVES (Avian Visual Educational System) is a bilingual educational platform for bird identification and vocabulary learning.

        ## Features
        - **AI-Powered Annotations**: Generate anatomical annotations using Claude Vision AI
        - **Bilingual Learning**: Spanish-English vocabulary with progressive disclosure
        - **Gamified Exercises**: Multiple exercise types with difficulty progression
        - **Species Database**: Comprehensive bird species information
        - **Review Workflow**: AI annotation approval/rejection system

        ## Authentication
        Most endpoints require JWT authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`

        ## Rate Limiting
        - General API: 100 requests per 15 minutes
        - AI Generation: 50 requests per hour
      `,
      contact: {
        name: 'AVES Development Team',
        url: 'https://github.com/bjpl/aves'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local development server'
      },
      {
        url: 'https://aves-backend-production.up.railway.app',
        description: 'Production server (Railway)'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User registration, login, and token verification'
      },
      {
        name: 'Species',
        description: 'Bird species information and statistics'
      },
      {
        name: 'Images',
        description: 'Image upload and management'
      },
      {
        name: 'Annotations',
        description: 'Manual annotation creation and management'
      },
      {
        name: 'AI Annotations',
        description: 'AI-powered annotation generation and review workflow'
      },
      {
        name: 'Exercises',
        description: 'Interactive learning exercises and progress tracking'
      },
      {
        name: 'Vocabulary',
        description: 'Vocabulary enrichment and progressive disclosure'
      },
      {
        name: 'Analytics',
        description: 'Learning analytics and performance metrics'
      },
      {
        name: 'Health',
        description: 'System health and status endpoints'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login or /api/auth/register'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Validation error details (if applicable)'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT authentication token (valid for 24 hours)'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        BoundingBox: {
          type: 'object',
          required: ['x', 'y', 'width', 'height'],
          properties: {
            x: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              description: 'X coordinate (normalized 0-1)'
            },
            y: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              description: 'Y coordinate (normalized 0-1)'
            },
            width: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              description: 'Width (normalized 0-1)'
            },
            height: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              description: 'Height (normalized 0-1)'
            }
          }
        },
        Annotation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Annotation ID'
            },
            imageId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated image ID'
            },
            spanishTerm: {
              type: 'string',
              description: 'Spanish vocabulary term'
            },
            englishTerm: {
              type: 'string',
              description: 'English translation'
            },
            boundingBox: {
              $ref: '#/components/schemas/BoundingBox'
            },
            type: {
              type: 'string',
              enum: ['anatomical', 'behavioral', 'color', 'pattern'],
              description: 'Annotation category'
            },
            difficultyLevel: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              description: 'Learning difficulty (1=easiest, 5=hardest)'
            },
            pronunciation: {
              type: 'string',
              nullable: true,
              description: 'Pronunciation guide (optional)'
            },
            confidence: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              nullable: true,
              description: 'AI confidence score (for AI-generated annotations)'
            }
          }
        },
        Species: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Species ID'
            },
            scientificName: {
              type: 'string',
              description: 'Scientific (Latin) name'
            },
            spanishName: {
              type: 'string',
              description: 'Spanish common name'
            },
            englishName: {
              type: 'string',
              description: 'English common name'
            },
            orderName: {
              type: 'string',
              description: 'Taxonomic order'
            },
            familyName: {
              type: 'string',
              description: 'Taxonomic family'
            },
            genus: {
              type: 'string',
              description: 'Taxonomic genus'
            },
            sizeCategory: {
              type: 'string',
              nullable: true,
              description: 'Size classification'
            },
            primaryColors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Main plumage colors'
            },
            habitats: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Natural habitats'
            },
            conservationStatus: {
              type: 'string',
              nullable: true,
              description: 'IUCN conservation status'
            },
            descriptionSpanish: {
              type: 'string',
              nullable: true,
              description: 'Spanish description'
            },
            descriptionEnglish: {
              type: 'string',
              nullable: true,
              description: 'English description'
            },
            funFact: {
              type: 'string',
              nullable: true,
              description: 'Interesting fact about the species'
            }
          }
        },
        AIAnnotationJob: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'Unique job identifier'
            },
            imageId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated image ID'
            },
            status: {
              type: 'string',
              enum: ['processing', 'pending', 'approved', 'rejected', 'failed'],
              description: 'Current job status'
            },
            annotations: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Annotation'
              },
              description: 'Generated annotations (when status is pending/approved)'
            },
            confidenceScore: {
              type: 'number',
              format: 'float',
              nullable: true,
              description: 'Average confidence score'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.ts', // Scan all route files for JSDoc annotations
    './src/routes/**/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
