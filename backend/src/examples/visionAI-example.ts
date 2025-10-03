/**
 * VisionAI Service Usage Example
 *
 * Demonstrates how to use the VisionAI service to generate
 * bird anatomy annotations from images.
 */

import { Pool } from 'pg';
import { VisionAI } from '../services/visionAI';
import * as logger from '../utils/logger';

/**
 * Example 1: Basic annotation generation
 */
async function basicExample() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Initialize VisionAI service
    const visionAI = new VisionAI(pool, {
      apiKey: process.env.OPENAI_API_KEY,
      cacheEnabled: true,
      maxRetries: 3
    });

    // Annotate a bird image
    const imageUrl = 'https://images.unsplash.com/photo-1552728089-57bdde30beb3';
    const imageId = 'img_001';

    logger.info('Generating annotations for bird image...', { imageUrl });

    const annotations = await visionAI.annotateImage(imageUrl, imageId);

    logger.info('Annotations generated successfully', {
      count: annotations.length,
      features: annotations.map(a => a.spanishTerm)
    });

    // Display results
    annotations.forEach((annotation, index) => {
      console.log(`\n--- Annotation ${index + 1} ---`);
      console.log(`Spanish: ${annotation.spanishTerm}`);
      console.log(`English: ${annotation.englishTerm}`);
      console.log(`Pronunciation: ${annotation.pronunciation || 'N/A'}`);
      console.log(`Type: ${annotation.type}`);
      console.log(`Difficulty: ${annotation.difficultyLevel}/5`);
      console.log(`Bounding Box:`, annotation.boundingBox);
    });

  } catch (error) {
    logger.error('Failed to generate annotations', error as Error);
  } finally {
    await pool.end();
  }
}

/**
 * Example 2: Batch processing multiple images
 */
async function batchExample() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const visionAI = new VisionAI(pool, {
      apiKey: process.env.OPENAI_API_KEY,
      cacheEnabled: true
    });

    const images = [
      { id: 'img_001', url: 'https://example.com/bird1.jpg' },
      { id: 'img_002', url: 'https://example.com/bird2.jpg' },
      { id: 'img_003', url: 'https://example.com/bird3.jpg' }
    ];

    logger.info('Starting batch annotation', { totalImages: images.length });

    for (const image of images) {
      try {
        logger.info('Processing image', { imageId: image.id });

        const annotations = await visionAI.annotateImage(image.url, image.id);

        logger.info('Image annotated', {
          imageId: image.id,
          annotationCount: annotations.length
        });

        // Here you would typically save annotations to database
        // await saveAnnotations(annotations);

      } catch (error) {
        logger.error('Failed to annotate image', {
          imageId: image.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with next image
      }

      // Rate limiting: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('Batch annotation complete');

  } catch (error) {
    logger.error('Batch processing failed', error as Error);
  } finally {
    await pool.end();
  }
}

/**
 * Example 3: Using custom configuration
 */
async function customConfigExample() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Custom configuration for higher quality
    const visionAI = new VisionAI(pool, {
      apiKey: process.env.OPENAI_API_KEY,
      cacheEnabled: true,
      cacheDurationDays: 60, // Cache for 60 days
      maxRetries: 5, // More retries for production
      retryDelay: 3000, // 3 second base delay
      modelVersion: 'gpt-4o', // Explicit model version
      maxTokens: 3000, // Allow longer responses
      temperature: 0.2 // Lower temperature for consistency
    });

    const imageUrl = 'https://example.com/rare-bird.jpg';
    const annotations = await visionAI.annotateImage(imageUrl, 'img_rare_001');

    logger.info('High-quality annotations generated', {
      count: annotations.length
    });

  } catch (error) {
    logger.error('Annotation failed', error as Error);
  } finally {
    await pool.end();
  }
}

/**
 * Example 4: Validating responses
 */
async function validationExample() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const visionAI = new VisionAI(pool);

    // Example GPT-4o response
    const sampleResponse = [
      {
        spanishTerm: 'el pico',
        englishTerm: 'beak',
        boundingBox: { x: 0.45, y: 0.30, width: 0.10, height: 0.08 },
        type: 'anatomical',
        difficultyLevel: 1,
        pronunciation: 'el PEE-koh'
      }
    ];

    // Validate the response
    const isValid = visionAI.validateResponse(sampleResponse);

    if (isValid) {
      logger.info('Response is valid');
    } else {
      logger.warn('Response validation failed');
    }

  } catch (error) {
    logger.error('Validation example failed', error as Error);
  } finally {
    await pool.end();
  }
}

/**
 * Example 5: Getting service statistics
 */
async function statisticsExample() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const visionAI = new VisionAI(pool, {
      cacheEnabled: true
    });

    const stats = await visionAI.getStatistics();

    console.log('\n--- VisionAI Service Statistics ---');
    console.log(`Total Cached: ${stats.totalCached}`);
    console.log(`Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Avg Annotations/Image: ${stats.averageAnnotationsPerImage.toFixed(1)}`);

  } catch (error) {
    logger.error('Statistics example failed', error as Error);
  } finally {
    await pool.end();
  }
}

/**
 * Example GPT-4o successful response
 */
const exampleSuccessfulResponse = {
  imageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3',
  modelVersion: 'gpt-4o',
  tokensUsed: 1247,
  annotations: [
    {
      id: 'img_001_ann_0_1727875200000',
      imageId: 'img_001',
      boundingBox: {
        topLeft: { x: 0.45, y: 0.28 },
        bottomRight: { x: 0.55, y: 0.36 },
        width: 0.10,
        height: 0.08
      },
      type: 'anatomical',
      spanishTerm: 'el pico',
      englishTerm: 'beak',
      pronunciation: 'el PEE-koh',
      difficultyLevel: 1,
      isVisible: false,
      createdAt: new Date('2024-10-02T10:00:00Z'),
      updatedAt: new Date('2024-10-02T10:00:00Z')
    },
    {
      id: 'img_001_ann_1_1727875200000',
      imageId: 'img_001',
      boundingBox: {
        topLeft: { x: 0.25, y: 0.35 },
        bottomRight: { x: 0.75, y: 0.65 },
        width: 0.50,
        height: 0.30
      },
      type: 'anatomical',
      spanishTerm: 'las alas',
      englishTerm: 'wings',
      pronunciation: 'lahs AH-lahs',
      difficultyLevel: 1,
      isVisible: false,
      createdAt: new Date('2024-10-02T10:00:00Z'),
      updatedAt: new Date('2024-10-02T10:00:00Z')
    },
    {
      id: 'img_001_ann_2_1727875200000',
      imageId: 'img_001',
      boundingBox: {
        topLeft: { x: 0.60, y: 0.65 },
        bottomRight: { x: 0.85, y: 0.85 },
        width: 0.25,
        height: 0.20
      },
      type: 'anatomical',
      spanishTerm: 'la cola',
      englishTerm: 'tail',
      pronunciation: 'lah KOH-lah',
      difficultyLevel: 1,
      isVisible: false,
      createdAt: new Date('2024-10-02T10:00:00Z'),
      updatedAt: new Date('2024-10-02T10:00:00Z')
    },
    {
      id: 'img_001_ann_3_1727875200000',
      imageId: 'img_001',
      boundingBox: {
        topLeft: { x: 0.40, y: 0.20 },
        bottomRight: { x: 0.45, y: 0.26 },
        width: 0.05,
        height: 0.06
      },
      type: 'anatomical',
      spanishTerm: 'el ojo',
      englishTerm: 'eye',
      pronunciation: 'el OH-hoh',
      difficultyLevel: 2,
      isVisible: false,
      createdAt: new Date('2024-10-02T10:00:00Z'),
      updatedAt: new Date('2024-10-02T10:00:00Z')
    },
    {
      id: 'img_001_ann_4_1727875200000',
      imageId: 'img_001',
      boundingBox: {
        topLeft: { x: 0.30, y: 0.75 },
        bottomRight: { x: 0.40, y: 0.95 },
        width: 0.10,
        height: 0.20
      },
      type: 'anatomical',
      spanishTerm: 'las patas',
      englishTerm: 'legs',
      pronunciation: 'lahs PAH-tahs',
      difficultyLevel: 1,
      isVisible: false,
      createdAt: new Date('2024-10-02T10:00:00Z'),
      updatedAt: new Date('2024-10-02T10:00:00Z')
    },
    {
      id: 'img_001_ann_5_1727875200000',
      imageId: 'img_001',
      boundingBox: {
        topLeft: { x: 0.35, y: 0.30 },
        bottomRight: { x: 0.65, y: 0.55 },
        width: 0.30,
        height: 0.25
      },
      type: 'color',
      spanishTerm: 'plumas rojas',
      englishTerm: 'red feathers',
      pronunciation: 'PLOO-mahs ROH-hahs',
      difficultyLevel: 3,
      isVisible: false,
      createdAt: new Date('2024-10-02T10:00:00Z'),
      updatedAt: new Date('2024-10-02T10:00:00Z')
    }
  ]
};

/**
 * Example prompt sent to GPT-4o
 */
const examplePrompt = {
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this bird image and identify visible anatomical features...' // (Full prompt from service)
        },
        {
          type: 'image_url',
          image_url: {
            url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3',
            detail: 'high'
          }
        }
      ]
    }
  ],
  max_tokens: 2000,
  temperature: 0.3
};

// Export examples
export {
  basicExample,
  batchExample,
  customConfigExample,
  validationExample,
  statisticsExample,
  exampleSuccessfulResponse,
  examplePrompt
};

// Run example if executed directly
if (require.main === module) {
  const exampleType = process.argv[2] || 'basic';

  switch (exampleType) {
    case 'basic':
      basicExample();
      break;
    case 'batch':
      batchExample();
      break;
    case 'custom':
      customConfigExample();
      break;
    case 'validation':
      validationExample();
      break;
    case 'statistics':
      statisticsExample();
      break;
    default:
      console.log('Usage: tsx examples/visionAI-example.ts [basic|batch|custom|validation|statistics]');
      console.log('\nExample successful response:');
      console.log(JSON.stringify(exampleSuccessfulResponse, null, 2));
  }
}
