/**
 * Seed script to create sample AI annotation data for testing
 * Run with: node scripts/seed-annotation-data.js
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Sample species and their common annotations
 */
const SAMPLE_DATA = [
  {
    englishName: 'Mallard Duck',
    spanishName: 'Pato Real',
    scientificName: 'Anas platyrhynchos',
    orderName: 'Anseriformes',
    familyName: 'Anatidae',
    genus: 'Anas',
    habitats: ['wetlands', 'lakes', 'rivers'],
    sizeCategory: 'medium',
    primaryColors: ['green', 'brown', 'white'],
    conservationStatus: 'LC',
    annotations: [
      { type: 'anatomical', label: 'Wing', confidence: 0.92 },
      { type: 'anatomical', label: 'Bill', confidence: 0.88 },
      { type: 'anatomical', label: 'Tail Feathers', confidence: 0.85 },
      { type: 'behavioral', label: 'Swimming', confidence: 0.79 }
    ]
  },
  {
    englishName: 'American Robin',
    spanishName: 'Petirrojo Americano',
    scientificName: 'Turdus migratorius',
    orderName: 'Passeriformes',
    familyName: 'Turdidae',
    genus: 'Turdus',
    habitats: ['forests', 'urban', 'grasslands'],
    sizeCategory: 'small',
    primaryColors: ['red', 'brown', 'gray'],
    conservationStatus: 'LC',
    annotations: [
      { type: 'anatomical', label: 'Red Breast', confidence: 0.95 },
      { type: 'anatomical', label: 'Black Head', confidence: 0.91 },
      { type: 'behavioral', label: 'Ground Foraging', confidence: 0.82 }
    ]
  },
  {
    englishName: 'Blue Jay',
    spanishName: 'Arrendajo Azul',
    scientificName: 'Cyanocitta cristata',
    orderName: 'Passeriformes',
    familyName: 'Corvidae',
    genus: 'Cyanocitta',
    habitats: ['forests', 'urban', 'parks'],
    sizeCategory: 'medium',
    primaryColors: ['blue', 'white', 'black'],
    conservationStatus: 'LC',
    annotations: [
      { type: 'anatomical', label: 'Blue Crest', confidence: 0.93 },
      { type: 'anatomical', label: 'White Wing Bars', confidence: 0.87 },
      { type: 'behavioral', label: 'Seed Caching', confidence: 0.76 }
    ]
  }
];

/**
 * Get existing real images to use for annotations
 */
async function getExistingImages() {
  console.log('📷 Finding existing real images to annotate...');

  // Get real images that have valid Unsplash URLs (not test images)
  const imagesResult = await pool.query(`
    SELECT i.id, i.url, i.unsplash_id, s.english_name, s.scientific_name, s.id as species_id
    FROM images i
    JOIN species s ON i.species_id = s.id
    WHERE i.photographer != 'Test Photographer'
      AND i.url LIKE 'https://images.unsplash.com/%'
    ORDER BY RANDOM()
    LIMIT 30
  `);

  if (imagesResult.rows.length === 0) {
    console.log('  ⚠️ No real images found. Creating with sample species...');

    // If no real images exist, just get any species to work with
    const speciesResult = await pool.query(`
      SELECT id, english_name, scientific_name
      FROM species
      ORDER BY RANDOM()
      LIMIT 3
    `);

    if (speciesResult.rows.length === 0) {
      // Create sample species if none exist
      for (const sample of SAMPLE_DATA) {
        await pool.query(
          `INSERT INTO species (
            scientific_name, english_name, spanish_name,
            order_name, family_name, genus,
            habitats, size_category, primary_colors,
            conservation_status,
            description_english, description_spanish
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (scientific_name) DO NOTHING`,
          [
            sample.scientificName,
            sample.englishName,
            sample.spanishName,
            sample.orderName,
            sample.familyName,
            sample.genus,
            sample.habitats,
            sample.sizeCategory,
            sample.primaryColors,
            sample.conservationStatus,
            `A beautiful ${sample.englishName} commonly found in various habitats.`,
            `Un hermoso ${sample.spanishName} que se encuentra comúnmente en varios hábitats.`
          ]
        );
      }
    }

    // Return empty array, will create annotations without images if needed
    return [];
  }

  console.log(`  ✅ Found ${imagesResult.rows.length} real images to annotate`);
  return imagesResult.rows;
}

/**
 * Create sample AI annotation items
 */
async function createAnnotationItems(images) {
  console.log('\n🤖 Creating AI annotation items...');

  let totalCreated = 0;

  // If no real images provided, try to get any images from the database
  if (!images || images.length === 0) {
    const imagesResult = await pool.query(`
      SELECT i.id, i.url, s.english_name, s.scientific_name
      FROM images i
      JOIN species s ON i.species_id = s.id
      LIMIT 10
    `);
    images = imagesResult.rows;
  }

  if (images.length === 0) {
    console.log('  ⚠️ No images available for creating annotations');
    return;
  }

  // Sample annotations to use for any species
  const genericAnnotations = [
    { type: 'anatomical', label: 'Wing', confidence: 0.92 },
    { type: 'anatomical', label: 'Head', confidence: 0.88 },
    { type: 'anatomical', label: 'Tail', confidence: 0.85 },
    { type: 'behavioral', label: 'Perching', confidence: 0.79 }
  ];

  for (const image of images) {
    // Try to find matching sample data or use generic annotations
    const sampleData = SAMPLE_DATA.find(s => s.englishName === image.english_name);
    const annotations = sampleData ? sampleData.annotations : genericAnnotations;

    // Create 1-2 annotations per image
    const numAnnotations = Math.min(2, annotations.length);
    for (let i = 0; i < numAnnotations; i++) {
      const annotation = annotations[i];
      // Generate random bounding box (normalized 0-1)
      const x = Math.random() * 0.5 + 0.1;  // Between 0.1 and 0.6
      const y = Math.random() * 0.5 + 0.1;  // Between 0.1 and 0.6
      const width = Math.random() * 0.3 + 0.2;  // Between 0.2 and 0.5
      const height = Math.random() * 0.3 + 0.2; // Between 0.2 and 0.5

      // Create bounding box in the nested format expected by the database
      const boundingBox = {
        topLeft: { x, y },
        bottomRight: { x: x + width, y: y + height }
      };

      // Generate Spanish term (simplified translation)
      const spanishTerms = {
        'Wing': 'Ala',
        'Bill': 'Pico',
        'Tail Feathers': 'Plumas de Cola',
        'Swimming': 'Nadando',
        'Red Breast': 'Pecho Rojo',
        'Black Head': 'Cabeza Negra',
        'Ground Foraging': 'Forrajeo Terrestre',
        'Blue Crest': 'Cresta Azul',
        'White Wing Bars': 'Barras Alares Blancas',
        'Seed Caching': 'Almacenamiento de Semillas'
      };

      await pool.query(
        `INSERT INTO ai_annotation_items (
          job_id,
          image_id,
          spanish_term,
          english_term,
          bounding_box,
          annotation_type,
          difficulty_level,
          pronunciation,
          confidence,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT DO NOTHING`,
        [
          'seed-job-001',  // Use a consistent job_id for seeded data
          image.id,
          spanishTerms[annotation.label] || annotation.label,
          annotation.label,
          JSON.stringify(boundingBox),
          annotation.type,
          Math.floor(Math.random() * 3) + 1,  // Random difficulty 1-3
          `[${(spanishTerms[annotation.label] || annotation.label).toLowerCase()}]`,
          annotation.confidence,
          'pending'  // All start as pending for review
        ]
      );

      totalCreated++;
    }
  }

  console.log(`  ✅ Created ${totalCreated} annotation items`);
}

/**
 * Create a sample AI annotation job
 */
async function createAnnotationJob() {
  console.log('\n📋 Creating AI annotation job...');

  // Get any image to associate with the job
  const imageResult = await pool.query(
    `SELECT id FROM images LIMIT 1`
  );

  if (imageResult.rows.length === 0) {
    console.log('  ⚠️ No images found to create job');
    return;
  }

  const jobResult = await pool.query(
    `INSERT INTO ai_annotations (
      job_id,
      image_id,
      annotation_data,
      status,
      confidence_score,
      notes,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (job_id) DO UPDATE
    SET status = EXCLUDED.status,
        updated_at = NOW()
    RETURNING job_id`,
    [
      'seed-job-001',  // Match the job_id we use in annotation items
      imageResult.rows[0].id,
      JSON.stringify({
        model: 'claude-3-sonnet-20241022',
        annotations: [],  // Individual items are in ai_annotation_items table
        metadata: { source: 'seed-script', created: new Date().toISOString() }
      }),
      'approved',  // Use 'approved' instead of 'completed'
      0.85,  // Overall confidence score
      'Seeded data for testing annotation workflow'
    ]
  );

  if (jobResult.rows.length > 0) {
    console.log(`  ✅ Created/Updated job with ID: ${jobResult.rows[0].job_id}`);
  }
}

/**
 * Show summary statistics
 */
async function showStats() {
  console.log('\n📊 Database Statistics:');

  const stats = await pool.query(`
    SELECT
      (SELECT COUNT(DISTINCT species_id) FROM images WHERE id IN (SELECT DISTINCT image_id FROM ai_annotation_items)) as species_count,
      (SELECT COUNT(DISTINCT image_id) FROM ai_annotation_items) as image_count,
      (SELECT COUNT(*) FROM ai_annotation_items) as annotation_count,
      (SELECT COUNT(*) FROM ai_annotation_items WHERE status = 'pending') as pending_count,
      (SELECT COUNT(*) FROM ai_annotation_items WHERE status = 'approved') as approved_count,
      (SELECT COUNT(*) FROM ai_annotation_items WHERE status = 'rejected') as rejected_count
  `);

  const s = stats.rows[0];
  console.log(`  📦 Species: ${s.species_count}`);
  console.log(`  🖼️ Images: ${s.image_count}`);
  console.log(`  🏷️ Total Annotations: ${s.annotation_count}`);
  console.log(`     ⏳ Pending: ${s.pending_count}`);
  console.log(`     ✅ Approved: ${s.approved_count}`);
  console.log(`     ❌ Rejected: ${s.rejected_count}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🌱 Seeding Annotation Data');
  console.log('===========================\n');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected\n');

    // Get existing real images to annotate
    const realImages = await getExistingImages();

    // Create annotation job and items
    await createAnnotationJob();  // Create job BEFORE items that reference it
    await createAnnotationItems(realImages);
    await showStats();

    console.log('\n✨ Seeding complete!');
    console.log('🎯 You can now:');
    console.log('   1. Visit http://localhost:5173/admin/annotations');
    console.log('   2. Review pending annotations');
    console.log('   3. Approve or reject annotations');
    console.log('   4. View analytics and statistics');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the seeding
main();