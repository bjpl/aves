/**
 * Analyze Existing Annotations
 * Process existing annotations with PatternLearner to populate ML analytics
 */

import { createClient } from '@supabase/supabase-js';
import { PatternLearner } from '../src/services/PatternLearner';
import { AIAnnotation } from '../src/services/VisionAIService';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeExistingAnnotations() {
  console.log('\n🔍 Analyzing Existing Annotations for ML Patterns\n');

  // Fetch all approved annotations with image and species data
  const { data: annotations, error } = await supabase
    .from('ai_annotation_items')
    .select(`
      id,
      spanish_term,
      english_term,
      confidence,
      bounding_box,
      created_at,
      image_id
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error || !annotations) {
    console.error('❌ Error fetching annotations:', error);
    return;
  }

  console.log(`📊 Found ${annotations.length} annotations to analyze\n`);

  // Initialize PatternLearner
  const patternLearner = new PatternLearner();

  // Give it time to load existing patterns from memory
  console.log('⏳ Initializing PatternLearner...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Fetch image and species data for these annotations
  const uniqueImageIds = [...new Set(annotations.map(a => a.image_id))];

  const { data: images } = await supabase
    .from('images')
    .select(`
      id,
      url,
      species (
        english_name,
        spanish_name
      )
    `)
    .in('id', uniqueImageIds);

  const imageMap = new Map(images?.map(img => [img.id.toString(), img]) || []);

  // Group annotations by image
  const imageGroups = new Map<string, any[]>();
  for (const ann of annotations) {
    const imageId = ann.image_id;
    if (!imageId || !imageMap.has(imageId)) continue;

    if (!imageGroups.has(imageId)) {
      imageGroups.set(imageId, []);
    }
    imageGroups.get(imageId)!.push(ann);
  }

  console.log(`🖼️  Processing ${imageGroups.size} images with annotations\n`);

  let processedCount = 0;

  for (const [imageId, imageAnnotations] of imageGroups.entries()) {
    const imageData = imageMap.get(imageId);
    if (!imageData) continue;

    const speciesName = (imageData.species as any)?.english_name || 'Unknown';
    const imageUrl = imageData.url || '';

    console.log(`\n📸 Image ${++processedCount}/${imageGroups.size}: ${speciesName}`);
    console.log(`   Annotations: ${imageAnnotations.length}`);

    // Convert to AIAnnotation format for PatternLearner
    const aiAnnotations: AIAnnotation[] = imageAnnotations.map(ann => {
      const bbox = ann.bounding_box ? (typeof ann.bounding_box === 'string' ? JSON.parse(ann.bounding_box) : ann.bounding_box) : { x: 0, y: 0, width: 0, height: 0 };
      return {
        feature_name: ann.english_term || 'unknown',
        confidence: ann.confidence || 0,
        x: bbox.x || 0,
        y: bbox.y || 0,
        width: bbox.width || 0,
        height: bbox.height || 0
      };
    });

    // Learn from these annotations
    await patternLearner.learnFromAnnotations(
      aiAnnotations,
      {
        species: speciesName,
        imageCharacteristics: []
      }
    );

    // Display learned patterns
    const features = aiAnnotations.map(a => a.feature_name).join(', ');
    const avgConfidence = (aiAnnotations.reduce((sum, a) => sum + a.confidence, 0) / aiAnnotations.length).toFixed(3);
    console.log(`   Features: ${features}`);
    console.log(`   Avg Confidence: ${avgConfidence}`);
  }

  // Get final analytics
  console.log('\n\n📈 Final Pattern Learning Analytics:\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const analytics = patternLearner.getAnalytics();

  console.log(`✅ Total Patterns Learned: ${analytics.totalPatterns}`);
  console.log(`✅ Species Tracked: ${analytics.speciesTracked}`);
  console.log(`\n🔝 Top Features:`);

  analytics.topFeatures.slice(0, 10).forEach((feature, idx) => {
    const featureName = String(feature.feature || 'unknown');
    console.log(`   ${idx + 1}. ${featureName.padEnd(20)} - ${feature.observations} obs, ${(feature.confidence * 100).toFixed(1)}% confidence`);
  });

  console.log(`\n📊 Species Breakdown:`);
  analytics.speciesBreakdown.forEach(species => {
    const speciesName = String(species.species || 'unknown');
    console.log(`   ${speciesName.padEnd(25)} - ${species.annotations} annotations, ${species.features} unique features`);
  });

  console.log('\n✅ Pattern learning complete! ML analytics dashboard should now show data.\n');
}

analyzeExistingAnnotations().catch(console.error);
