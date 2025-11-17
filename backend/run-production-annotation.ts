import { visionAIService } from './src/services/VisionAIService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runProductionAnnotation() {
  console.log('🚀 Starting production annotation with Claude Sonnet 4.5...\n');
  console.log(`Neural Ensemble: ${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20241022'}`);
  console.log(`Max Tokens: 30000\n`);

  // Get images that need annotation
  const { data: images, error } = await supabase
    .from('images')
    .select('id, url, species_id')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching images:', error);
    return;
  }

  if (!images || images.length === 0) {
    console.log('ℹ️  No images found in database');
    return;
  }

  console.log(`📸 Found ${images.length} images to process\n`);

  let totalAnnotations = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const image of images) {
    try {
      console.log(`\n🔍 Processing image ${successCount + errorCount + 1}/${images.length}: ${image.id}`);
      console.log(`   URL: ${image.url.substring(0, 60)}...`);

      const annotations = await visionAIService.generateAnnotations(image.url, image.id);

      console.log(`✅ Generated ${annotations.length} annotations`);
      totalAnnotations += annotations.length;

      // Store annotations in database
      for (const ann of annotations) {
        const { error: insertError } = await supabase
          .from('annotations')
          .insert({
            image_id: image.id,
            species_id: image.species_id,
            spanish_term: ann.spanishTerm,
            english_term: ann.englishTerm,
            bounding_box: ann.boundingBox,
            type: ann.type,
            difficulty_level: ann.difficultyLevel,
            pronunciation: ann.pronunciation
          });

        if (insertError) {
          console.error(`   ⚠️  Error storing: ${insertError.message}`);
        } else {
          console.log(`   ✓ ${ann.spanishTerm} (${ann.englishTerm}) - confidence: ${(ann.confidence || 0.8).toFixed(2)}`);
        }
      }

      successCount++;

      // Rate limit: 1 second between requests
      if (successCount + errorCount < images.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      errorCount++;
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 PRODUCTION RESULTS:');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/${images.length} images`);
  console.log(`❌ Failed: ${errorCount}/${images.length} images`);
  console.log(`📝 Total Annotations: ${totalAnnotations}`);
  console.log(`⚡ Neural Model: Claude Sonnet 4.5 (30k tokens)`);
  console.log('='.repeat(60));
}

runProductionAnnotation().catch(console.error);
