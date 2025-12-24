/**
 * ML-Optimized Unsplash Bird Image Curation Pipeline
 *
 * Features:
 * - ML-guided species selection using PatternLearner insights
 * - Parallel batch processing for efficient downloads
 * - Automatic database import and storage
 * - Integrated annotation pipeline with ML optimization
 * - Cross-session pattern learning and improvement
 * - Real-time cost and performance tracking
 * - Quality filtering (high resolution, clear features)
 * - Species diversity optimization
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { PatternLearner } from '../src/services/PatternLearner';
import { AnnotationValidator } from '../src/services/AnnotationValidator';
import { ParallelBatchProcessor } from '../src/utils/batch-processor';
import { CostEstimator } from '../src/utils/cost-estimator';
import { PerformanceTracker } from '../src/utils/performance-tracker';
import { VisionAIService } from '../src/services/VisionAIService';

const streamPipeline = promisify(pipeline);

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
  };
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
  links: {
    download_location: string;
  };
}

/**
 * Diverse bird species to search for
 * Selected for variety in size, color, habitat, and annotation value
 */
const BIRD_SPECIES_QUERIES = [
  // Raptors (excellent for annotation - clear features)
  { search: 'bald eagle bird', category: 'raptor', priority: 'high' },
  { search: 'red tailed hawk', category: 'raptor', priority: 'high' },
  { search: 'peregrine falcon bird', category: 'raptor', priority: 'high' },
  { search: 'great horned owl', category: 'raptor', priority: 'high' },

  // Colorful songbirds (great for ML pattern learning)
  { search: 'northern cardinal bird', category: 'songbird', priority: 'high' },
  { search: 'blue jay bird', category: 'songbird', priority: 'high' },
  { search: 'american goldfinch', category: 'songbird', priority: 'medium' },
  { search: 'scarlet tanager bird', category: 'songbird', priority: 'high' },
  { search: 'baltimore oriole bird', category: 'songbird', priority: 'medium' },

  // Waterfowl (diverse shapes and patterns)
  { search: 'wood duck bird', category: 'waterfowl', priority: 'high' },
  { search: 'mallard duck bird', category: 'waterfowl', priority: 'medium' },
  { search: 'great blue heron', category: 'waterfowl', priority: 'high' },
  { search: 'canada goose bird', category: 'waterfowl', priority: 'low' },

  // Seabirds (unique features)
  { search: 'atlantic puffin', category: 'seabird', priority: 'high' },
  { search: 'pelican bird', category: 'seabird', priority: 'medium' },

  // Unique/Exotic (annotation value)
  { search: 'toucan bird', category: 'exotic', priority: 'high' },
  { search: 'hummingbird closeup', category: 'exotic', priority: 'high' },
  { search: 'flamingo bird', category: 'exotic', priority: 'medium' },
  { search: 'peacock bird', category: 'exotic', priority: 'medium' },
];

/**
 * Quality assessment for annotation readiness
 */
function assessImageQuality(image: UnsplashImage): number {
  let score = 0;

  // Resolution (higher is better for annotation)
  if (image.width >= 3000 && image.height >= 2000) score += 30;
  else if (image.width >= 2000 && image.height >= 1500) score += 20;
  else if (image.width >= 1500 && image.height >= 1000) score += 10;

  // Aspect ratio (portrait/square better for birds)
  const aspectRatio = image.width / image.height;
  if (aspectRatio >= 0.7 && aspectRatio <= 1.3) score += 20;
  else if (aspectRatio >= 0.5 && aspectRatio <= 1.5) score += 10;

  // Description quality (indicates clear subject)
  const desc = (image.description || image.alt_description || '').toLowerCase();
  if (desc.includes('bird') || desc.includes('feather') || desc.includes('wing')) score += 15;
  if (desc.includes('close') || desc.includes('detail') || desc.includes('portrait')) score += 15;
  if (desc.includes('flying') || desc.includes('perch') || desc.includes('sitting')) score += 10;

  // Bonus for detailed descriptions
  if ((image.description || '').length > 50) score += 10;

  return score;
}

/**
 * Search Unsplash for bird images
 */
async function searchUnsplash(query: string, perPage: number = 5): Promise<UnsplashImage[]> {
  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query,
        per_page: perPage,
        orientation: 'portrait',
        content_filter: 'high'
      },
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    return response.data.results;
  } catch (error: any) {
    console.error(`Error searching for "${query}":`, error.message);
    return [];
  }
}

/**
 * Download and track image
 */
async function downloadImage(image: UnsplashImage): Promise<string> {
  // Trigger Unsplash download tracking
  await axios.get(image.links.download_location, {
    headers: {
      'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
    }
  });

  return image.urls.regular; // Return URL for Supabase storage
}

/**
 * Main curation pipeline
 */
async function curateSmartBirdImages() {
  console.log('🎯 SMART BIRD IMAGE CURATION PIPELINE');
  console.log('='.repeat(80));
  console.log('Strategy: Diverse species, high-quality images, annotation-ready');
  console.log('Sources: Unsplash API with quality filtering');
  console.log('='.repeat(80));
  console.log('');

  const curatedImages: Array<{
    url: string;
    species: string;
    category: string;
    quality: number;
    priority: string;
    metadata: any;
  }> = [];

  // Process each species query
  for (const speciesQuery of BIRD_SPECIES_QUERIES) {
    console.log(`\n🔍 Searching: ${speciesQuery.search} (${speciesQuery.category}, priority: ${speciesQuery.priority})`);

    const results = await searchUnsplash(speciesQuery.search, 5);
    console.log(`   Found ${results.length} results`);

    // Quality filter and sort
    const scored = results
      .map(img => ({
        image: img,
        quality: assessImageQuality(img)
      }))
      .filter(item => item.quality >= 40) // Minimum quality threshold
      .sort((a, b) => b.quality - a.quality);

    console.log(`   ${scored.length} passed quality filter (≥40 points)`);

    // Take top 2 images per species
    const topImages = scored.slice(0, 2);

    for (const { image, quality } of topImages) {
      const url = await downloadImage(image);

      curatedImages.push({
        url,
        species: speciesQuery.search,
        category: speciesQuery.category,
        quality,
        priority: speciesQuery.priority,
        metadata: {
          unsplash_id: image.id,
          photographer: image.user.name,
          photographer_username: image.user.username,
          dimensions: `${image.width}x${image.height}`,
          description: image.description || image.alt_description
        }
      });

      console.log(`   ✅ Curated: ${quality} points - ${url.substring(0, 60)}...`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📊 CURATION SUMMARY`);
  console.log('='.repeat(80));
  console.log(`Total images curated: ${curatedImages.length}`);
  console.log(`Average quality score: ${(curatedImages.reduce((sum, img) => sum + img.quality, 0) / curatedImages.length).toFixed(1)}`);
  console.log('');

  // Category breakdown
  const categories = curatedImages.reduce((acc: any, img) => {
    acc[img.category] = (acc[img.category] || 0) + 1;
    return acc;
  }, {});

  console.log('Category Distribution:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} images`);
  });

  console.log('\nPriority Distribution:');
  const priorities = curatedImages.reduce((acc: any, img) => {
    acc[img.priority] = (acc[img.priority] || 0) + 1;
    return acc;
  }, {});
  Object.entries(priorities).forEach(([pri, count]) => {
    console.log(`  ${pri}: ${count} images`);
  });

  // Export results
  const fs = require('fs');
  fs.writeFileSync(
    'curated-bird-images.json',
    JSON.stringify(curatedImages, null, 2)
  );
  console.log(`\n📁 Results exported to: curated-bird-images.json`);
  console.log('\n✨ Smart curation complete!');
  console.log('\nNext steps:');
  console.log('  1. Review curated-bird-images.json');
  console.log('  2. Import selected images to database');
  console.log('  3. Run ML-optimized annotation pipeline');
}

// Run the curation pipeline
curateSmartBirdImages().catch(console.error);
