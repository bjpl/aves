/**
 * Image Collection Script
 *
 * CONCEPT: Automated bird image collection from Unsplash with species metadata
 * WHY: Need curated dataset of bird images for Claude annotation generation
 * PATTERN: Batch processing with rate limiting and error handling
 *
 * Usage: npx tsx src/scripts/collect-images.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { pool } from '../database/connection';
import { info, error as logError } from '../utils/logger';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const UNSPLASH_API_URL = 'https://api.unsplash.com';

// Test set: 5 common bird species (2 images each = 10 total)
const BIRD_SPECIES = [
  {
    scientificName: 'Cardinalis cardinalis',
    englishName: 'Northern Cardinal',
    spanishName: 'Cardenal Norteño',
    order: 'Passeriformes',
    family: 'Cardinalidae',
    searchTerms: 'northern cardinal red bird',
    habitats: ['forest', 'urban', 'garden'],
    sizeCategory: 'small',
    primaryColors: ['red', 'black'],
    conservationStatus: 'LC'
  },
  {
    scientificName: 'Cyanocitta cristata',
    englishName: 'Blue Jay',
    spanishName: 'Arrendajo Azul',
    order: 'Passeriformes',
    family: 'Corvidae',
    searchTerms: 'blue jay bird',
    habitats: ['forest', 'urban'],
    sizeCategory: 'small',
    primaryColors: ['blue', 'white', 'black'],
    conservationStatus: 'LC'
  },
  {
    scientificName: 'Turdus migratorius',
    englishName: 'American Robin',
    spanishName: 'Petirrojo Americano',
    order: 'Passeriformes',
    family: 'Turdidae',
    searchTerms: 'american robin bird',
    habitats: ['forest', 'urban', 'garden'],
    sizeCategory: 'small',
    primaryColors: ['red', 'brown', 'gray'],
    conservationStatus: 'LC'
  },
  {
    scientificName: 'Zenaida macroura',
    englishName: 'Mourning Dove',
    spanishName: 'Paloma Huilota',
    order: 'Columbiformes',
    family: 'Columbidae',
    searchTerms: 'mourning dove bird',
    habitats: ['urban', 'grassland'],
    sizeCategory: 'small',
    primaryColors: ['brown', 'gray'],
    conservationStatus: 'LC'
  },
  {
    scientificName: 'Passer domesticus',
    englishName: 'House Sparrow',
    spanishName: 'Gorrión Común',
    order: 'Passeriformes',
    family: 'Passeridae',
    searchTerms: 'house sparrow bird',
    habitats: ['urban'],
    sizeCategory: 'small',
    primaryColors: ['brown', 'gray'],
    conservationStatus: 'LC'
  }
];

const IMAGES_PER_SPECIES = 2; // 2 images per species = 10 total

// ============================================================================
// Main Functions
// ============================================================================

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  width: number;
  height: number;
  color: string;
  description: string | null;
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
}

/**
 * Search Unsplash for bird images
 */
async function searchUnsplash(query: string, perPage: number = 2): Promise<UnsplashPhoto[]> {
  try {
    info('Searching Unsplash', { query, perPage });

    const response = await axios.get(`${UNSPLASH_API_URL}/search/photos`, {
      params: {
        query,
        per_page: perPage,
        orientation: 'landscape',
        content_filter: 'high',
      },
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    info('Unsplash search successful', { query, resultsCount: response.data.results.length });
    return response.data.results;

  } catch (error) {
    logError('Unsplash search failed', error as Error);
    return [];
  }
}

/**
 * Insert species into database
 */
async function insertSpecies(species: typeof BIRD_SPECIES[0]): Promise<string> {
  try {
    const result = await pool.query(
      `INSERT INTO species (
        scientific_name, english_name, spanish_name,
        order_name, family_name, habitats, size_category,
        primary_colors, conservation_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (scientific_name) DO UPDATE SET
        english_name = EXCLUDED.english_name,
        spanish_name = EXCLUDED.spanish_name
      RETURNING id`,
      [
        species.scientificName,
        species.englishName,
        species.spanishName,
        species.order,
        species.family,
        species.habitats,
        species.sizeCategory,
        species.primaryColors,
        species.conservationStatus
      ]
    );

    const speciesId = result.rows[0].id;
    info('Species inserted/updated', { scientificName: species.scientificName, speciesId });
    return speciesId;

  } catch (error) {
    logError('Failed to insert species', error as Error);
    throw error;
  }
}

/**
 * Insert image metadata into database
 */
async function insertImage(
  speciesId: string,
  photo: UnsplashPhoto,
  speciesName: string
): Promise<string> {
  try {
    const result = await pool.query(
      `INSERT INTO images (
        species_id, unsplash_id, url, width, height,
        description, photographer, photographer_username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (unsplash_id) DO UPDATE SET
        url = EXCLUDED.url
      RETURNING id`,
      [
        speciesId,
        photo.id,
        photo.urls.regular,
        photo.width,
        photo.height,
        photo.description || photo.alt_description || `${speciesName} photograph`,
        photo.user.name,
        photo.user.username
      ]
    );

    const imageId = result.rows[0].id;
    info('Image inserted/updated', { unsplashId: photo.id, imageId });
    return imageId;

  } catch (error) {
    logError('Failed to insert image', error as Error);
    throw error;
  }
}

/**
 * Check if species and images tables exist
 */
async function checkTables(): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('species', 'images')
    `);

    const tableNames = result.rows.map(r => r.table_name);
    const hasSpecies = tableNames.includes('species');
    const hasImages = tableNames.includes('images');

    if (!hasSpecies || !hasImages) {
      logError('Missing required tables. Run migrations first.', new Error('Tables missing'));
      console.log('\n❌ Missing tables:');
      if (!hasSpecies) console.log('   - species');
      if (!hasImages) console.log('   - images');
      console.log('\n📝 Run: cd backend && npm run migrate\n');
      return false;
    }

    return true;
  } catch (error) {
    logError('Failed to check tables', error as Error);
    return false;
  }
}

/**
 * Main collection workflow
 */
async function collectImages() {
  console.log('\n🐦 AVES Image Collection Script');
  console.log('================================\n');

  // Validate environment
  if (!UNSPLASH_ACCESS_KEY) {
    console.error('❌ UNSPLASH_ACCESS_KEY not configured in .env');
    process.exit(1);
  }

  // Check database tables
  const tablesExist = await checkTables();
  if (!tablesExist) {
    process.exit(1);
  }

  console.log(`📊 Collecting images for ${BIRD_SPECIES.length} species`);
  console.log(`📷 ${IMAGES_PER_SPECIES} images per species = ${BIRD_SPECIES.length * IMAGES_PER_SPECIES} total\n`);

  const results = {
    speciesProcessed: 0,
    imagesCollected: 0,
    errors: 0
  };

  // Process each species
  for (const species of BIRD_SPECIES) {
    console.log(`\n🔍 Processing: ${species.englishName} (${species.spanishName})`);

    try {
      // Insert species record
      const speciesId = await insertSpecies(species);
      console.log(`   ✅ Species ID: ${speciesId}`);

      // Search for images
      const photos = await searchUnsplash(species.searchTerms, IMAGES_PER_SPECIES);

      if (photos.length === 0) {
        console.log(`   ⚠️  No images found on Unsplash`);
        results.errors++;
        continue;
      }

      // Insert each image
      for (const photo of photos) {
        const imageId = await insertImage(speciesId, photo, species.englishName);
        console.log(`   ✅ Image: ${photo.id} → ${imageId}`);
        results.imagesCollected++;

        // Rate limiting - wait 1 second between requests
        await sleep(1000);
      }

      results.speciesProcessed++;

    } catch (error) {
      console.error(`   ❌ Error processing ${species.englishName}:`, (error as Error).message);
      results.errors++;
    }
  }

  // Summary
  console.log('\n\n📊 Collection Summary');
  console.log('====================');
  console.log(`✅ Species processed: ${results.speciesProcessed}/${BIRD_SPECIES.length}`);
  console.log(`📷 Images collected: ${results.imagesCollected}`);
  console.log(`❌ Errors: ${results.errors}`);
  console.log('\n🎉 Collection complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Run: npx tsx src/scripts/batch-annotate.ts');
  console.log('   2. Review annotations in admin panel');
  console.log('   3. Approve annotations for learning content\n');
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Execute
// ============================================================================

collectImages()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logError('Fatal error in image collection', error);
    process.exit(1);
  });
