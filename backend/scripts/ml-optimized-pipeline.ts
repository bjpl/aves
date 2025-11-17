/**
 * ML-Optimized Bird Annotation Pipeline with Vocabulary Balance
 *
 * This master orchestrator integrates:
 * 1. PatternLearner analysis to identify vocabulary gaps
 * 2. ML-guided species selection for balanced training data
 * 3. Smart Unsplash curation targeting weak features
 * 4. Parallel batch annotation with ML optimization
 * 5. Vocabulary balance analysis and accuracy improvement tracking
 *
 * Goals:
 * - Improve tagging accuracy through targeted data collection
 * - Balance anatomical vocabulary across species
 * - Identify and fill feature learning gaps
 * - Track cross-session ML improvements
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

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface UnsplashImage {
  id: string;
  urls: { raw: string; full: string; regular: string; small: string };
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  user: { name: string; username: string };
  links: { download_location: string };
}

interface VocabularyGap {
  feature: string;
  currentCount: number;
  targetCount: number;
  deficit: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface SpeciesPriority {
  species: string;
  category: string;
  searchQuery: string;
  priority: number;
  reason: string;
  targetFeatures: string[];
}

/**
 * Step 1: Analyze existing ML patterns to identify gaps
 */
async function analyzeVocabularyGaps(): Promise<VocabularyGap[]> {
  console.log('\n🧠 ANALYZING ML PATTERNS FOR VOCABULARY GAPS');
  console.log('='.repeat(80));

  const patternLearner = new PatternLearner();

  // Wait for initialization to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get learned patterns from analytics
  const analytics = patternLearner.getAnalytics();

  // Define comprehensive anatomical vocabulary
  const targetVocabulary = [
    // Head features
    'beak', 'bill', 'eye', 'crest', 'crown', 'nape', 'throat', 'chin',
    // Body features
    'breast', 'belly', 'back', 'rump', 'flank', 'wing', 'tail', 'leg', 'foot',
    // Wing details
    'primary feathers', 'secondary feathers', 'wing bar', 'wing coverts',
    // Tail details
    'tail feathers', 'undertail coverts', 'tail tip',
    // Plumage
    'plumage', 'feathers', 'pattern', 'marking', 'stripe', 'spot', 'patch'
  ];

  // Count current feature occurrences from analytics
  const featureCounts = new Map<string, number>();
  for (const topFeature of analytics.topFeatures) {
    featureCounts.set(topFeature.feature, topFeature.observations);
  }

  // Calculate target counts (proportional to total annotations)
  const totalFeatures = Array.from(featureCounts.values()).reduce((sum, count) => sum + count, 0);
  const targetPerFeature = Math.max(10, Math.ceil(totalFeatures / targetVocabulary.length));

  // Identify gaps
  const gaps: VocabularyGap[] = targetVocabulary.map(feature => {
    const currentCount = featureCounts.get(feature) || 0;
    const deficit = targetPerFeature - currentCount;

    let priority: VocabularyGap['priority'];
    if (deficit > targetPerFeature * 0.8) priority = 'critical';
    else if (deficit > targetPerFeature * 0.5) priority = 'high';
    else if (deficit > targetPerFeature * 0.2) priority = 'medium';
    else priority = 'low';

    return {
      feature,
      currentCount,
      targetCount: targetPerFeature,
      deficit: Math.max(0, deficit),
      priority
    };
  }).filter(gap => gap.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit);

  console.log(`\n📊 Vocabulary Gap Analysis:`);
  console.log(`   Total features tracked: ${featureCounts.size}`);
  console.log(`   Target vocabulary size: ${targetVocabulary.length}`);
  console.log(`   Features with gaps: ${gaps.length}`);
  console.log(`\n🎯 Top Priority Gaps:`);
  gaps.slice(0, 10).forEach(gap => {
    console.log(`   ${gap.feature.padEnd(20)} - ${gap.currentCount.toString().padStart(3)}/${gap.targetCount} (${gap.priority})`);
  });

  return gaps;
}

/**
 * Step 2: Generate ML-guided species priorities
 */
async function generateMLGuidedSpeciesPriorities(gaps: VocabularyGap[]): Promise<SpeciesPriority[]> {
  console.log('\n🎯 GENERATING ML-GUIDED SPECIES PRIORITIES');
  console.log('='.repeat(80));

  // Map features to bird species that typically exhibit them prominently
  const featureToSpeciesMap: Record<string, Array<{
    species: string;
    category: string;
    searchQuery: string;
  }>> = {
    'beak': [
      { species: 'Toucan', category: 'exotic', searchQuery: 'toucan bird beak' },
      { species: 'Pelican', category: 'seabird', searchQuery: 'pelican bird bill' },
      { species: 'Puffin', category: 'seabird', searchQuery: 'atlantic puffin beak' }
    ],
    'crest': [
      { species: 'Northern Cardinal', category: 'songbird', searchQuery: 'northern cardinal crest' },
      { species: 'Blue Jay', category: 'songbird', searchQuery: 'blue jay crest' },
      { species: 'Cockatiel', category: 'exotic', searchQuery: 'cockatiel crest' }
    ],
    'wing bar': [
      { species: 'American Goldfinch', category: 'songbird', searchQuery: 'american goldfinch wing' },
      { species: 'Red-winged Blackbird', category: 'songbird', searchQuery: 'red winged blackbird wing bar' }
    ],
    'primary feathers': [
      { species: 'Bald Eagle', category: 'raptor', searchQuery: 'bald eagle wing feathers' },
      { species: 'Red-tailed Hawk', category: 'raptor', searchQuery: 'red tailed hawk primary feathers' },
      { species: 'Peregrine Falcon', category: 'raptor', searchQuery: 'peregrine falcon wing detail' }
    ],
    'tail feathers': [
      { species: 'Peacock', category: 'exotic', searchQuery: 'peacock tail feathers display' },
      { species: 'Scissor-tailed Flycatcher', category: 'songbird', searchQuery: 'scissor tailed flycatcher' }
    ],
    'plumage': [
      { species: 'Wood Duck', category: 'waterfowl', searchQuery: 'wood duck plumage detail' },
      { species: 'Mandarin Duck', category: 'waterfowl', searchQuery: 'mandarin duck colorful plumage' }
    ],
    'eye': [
      { species: 'Great Horned Owl', category: 'raptor', searchQuery: 'great horned owl eye close' },
      { species: 'Barn Owl', category: 'raptor', searchQuery: 'barn owl face eye' }
    ],
    'throat': [
      { species: 'Ruby-throated Hummingbird', category: 'exotic', searchQuery: 'ruby throated hummingbird' },
      { species: 'American Robin', category: 'songbird', searchQuery: 'american robin breast throat' }
    ]
  };

  // Generate priorities based on critical/high priority gaps
  const priorities: SpeciesPriority[] = [];
  const criticalGaps = gaps.filter(g => g.priority === 'critical' || g.priority === 'high');

  for (const gap of criticalGaps.slice(0, 15)) { // Top 15 gaps
    const candidates = featureToSpeciesMap[gap.feature] || [];

    for (const candidate of candidates) {
      // Calculate priority score (higher deficit = higher priority)
      const priorityScore = gap.deficit * (gap.priority === 'critical' ? 2 : 1);

      priorities.push({
        species: candidate.species,
        category: candidate.category,
        searchQuery: candidate.searchQuery,
        priority: priorityScore,
        reason: `Target feature: ${gap.feature} (deficit: ${gap.deficit})`,
        targetFeatures: [gap.feature]
      });
    }
  }

  // Deduplicate and sort by priority
  const uniquePriorities = Array.from(
    new Map(priorities.map(p => [p.species, p])).values()
  ).sort((a, b) => b.priority - a.priority);

  console.log(`\n📋 ML-Guided Species Priorities:`);
  uniquePriorities.slice(0, 15).forEach((p, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${p.species.padEnd(30)} - Priority: ${p.priority.toFixed(0).padStart(4)} (${p.reason})`);
  });

  return uniquePriorities.slice(0, 15); // Top 15 species
}

/**
 * Step 3: Curate images from Unsplash with ML guidance
 */
async function curateMLTargetedImages(priorities: SpeciesPriority[]): Promise<Array<{
  url: string;
  species: string;
  category: string;
  searchQuery: string;
  quality: number;
  targetFeatures: string[];
  metadata: any;
}>> {
  console.log('\n🔍 CURATING ML-TARGETED IMAGES FROM UNSPLASH');
  console.log('='.repeat(80));

  const curatedImages: Array<any> = [];

  for (const priority of priorities) {
    console.log(`\n   Searching: ${priority.searchQuery} (priority: ${priority.priority.toFixed(0)})`);

    try {
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: priority.searchQuery,
          per_page: 3,
          orientation: 'portrait',
          content_filter: 'high'
        },
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      });

      const results = response.data.results as UnsplashImage[];
      console.log(`   Found ${results.length} results`);

      // Score images
      const scored = results.map(img => ({
        image: img,
        quality: assessImageQuality(img)
      }))
      .filter(item => item.quality >= 40)
      .sort((a, b) => b.quality - a.quality);

      // Take best image
      if (scored.length > 0) {
        const best = scored[0];

        // Trigger Unsplash download tracking
        await axios.get(best.image.links.download_location, {
          headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
        });

        curatedImages.push({
          url: best.image.urls.regular,
          species: priority.species,
          category: priority.category,
          searchQuery: priority.searchQuery,
          quality: best.quality,
          targetFeatures: priority.targetFeatures,
          metadata: {
            unsplash_id: best.image.id,
            photographer: best.image.user.name,
            photographer_username: best.image.user.username,
            dimensions: `${best.image.width}x${best.image.height}`,
            description: best.image.description || best.image.alt_description,
            ml_priority: priority.priority,
            ml_reason: priority.reason
          }
        });

        console.log(`   ✅ Curated: ${best.quality} pts - targeting ${priority.targetFeatures.join(', ')}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`   ❌ Error searching: ${error.message}`);
    }
  }

  console.log(`\n📊 Curation Complete: ${curatedImages.length} ML-targeted images`);
  return curatedImages;
}

function assessImageQuality(image: UnsplashImage): number {
  let score = 0;

  // Resolution scoring
  if (image.width >= 3000 && image.height >= 2000) score += 30;
  else if (image.width >= 2000 && image.height >= 1500) score += 20;
  else if (image.width >= 1500 && image.height >= 1000) score += 10;

  // Aspect ratio
  const aspectRatio = image.width / image.height;
  if (aspectRatio >= 0.7 && aspectRatio <= 1.3) score += 20;
  else if (aspectRatio >= 0.5 && aspectRatio <= 1.5) score += 10;

  // Description quality
  const desc = (image.description || image.alt_description || '').toLowerCase();
  if (desc.includes('bird') || desc.includes('feather') || desc.includes('wing')) score += 15;
  if (desc.includes('close') || desc.includes('detail') || desc.includes('portrait')) score += 15;
  if (desc.includes('flying') || desc.includes('perch') || desc.includes('sitting')) score += 10;
  if ((image.description || '').length > 50) score += 10;

  return score;
}

/**
 * Step 4: Import images to database
 */
async function importImagesToDatabase(images: any[]): Promise<number[]> {
  console.log('\n💾 IMPORTING IMAGES TO DATABASE');
  console.log('='.repeat(80));

  const imageIds: number[] = [];

  for (const img of images) {
    try {
      // Check if species exists
      const { data: existingSpecies } = await supabase
        .from('species')
        .select('id')
        .ilike('english_name', img.species)
        .single();

      let speciesId = existingSpecies?.id;

      // Create species if doesn't exist
      if (!speciesId) {
        console.log(`   Creating new species: ${img.species}`);
        const { data: newSpecies, error} = await supabase
          .from('species')
          .insert({
            english_name: img.species,
            spanish_name: img.species, // Placeholder - will be updated later
            scientific_name: img.species.toLowerCase().replace(/\s+/g, '_'),
            order_name: img.category, // Placeholder based on category
            family_name: img.category,
            description_english: `ML-curated image targeting: ${img.targetFeatures.join(', ')}`,
            description_spanish: `Imagen seleccionada por ML para: ${img.targetFeatures.join(', ')}`
          })
          .select('id')
          .single();

        if (error) {
          console.error(`   ❌ Error creating species: ${error.message}`);
          continue;
        }
        speciesId = newSpecies.id;
      }

      // Parse dimensions from metadata
      const dimensions = img.metadata.dimensions?.split('x') || ['0', '0'];
      const width = parseInt(dimensions[0]) || 0;
      const height = parseInt(dimensions[1]) || 0;

      // Insert image with all metadata fields
      const { data: newImage, error: imgError } = await supabase
        .from('images')
        .insert({
          species_id: speciesId,
          url: img.url,
          unsplash_id: img.metadata.unsplash_id,
          width,
          height,
          description: img.metadata.description,
          photographer: img.metadata.photographer,
          photographer_username: img.metadata.photographer_username,
          download_location: img.searchQuery
        })
        .select('id')
        .single();

      if (imgError) {
        // Skip duplicates silently, report other errors
        if (!imgError.message.includes('duplicate key')) {
          console.error(`   ❌ Error inserting image: ${imgError.message}`);
        } else {
          console.log(`   ⏭️  Skipped duplicate: ${img.species}`);
        }
        continue;
      }

      imageIds.push(newImage.id);
      console.log(`   ✅ Imported: ${img.species} (image_id: ${newImage.id})`);

    } catch (error: any) {
      console.error(`   ❌ Import error: ${error.message}`);
    }
  }

  console.log(`\n📊 Import Complete: ${imageIds.length}/${images.length} images imported`);
  return imageIds;
}

/**
 * Step 5: Run ML-optimized annotation pipeline
 */
async function runMLAnnotationPipeline(imageIds: number[]): Promise<void> {
  console.log('\n🤖 RUNNING ML-OPTIMIZED ANNOTATION PIPELINE');
  console.log('='.repeat(80));

  const visionService = new VisionAIService();
  const patternLearner = new PatternLearner();
  const validator = new AnnotationValidator();
  const costEstimator = new CostEstimator(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929');
  const performanceTracker = new PerformanceTracker();

  await patternLearner.initialize();

  // Fetch images with species info
  const { data: images, error } = await supabase
    .from('images')
    .select(`
      id,
      url,
      species:species_id (
        id,
        english_name,
        scientific_name
      )
    `)
    .in('id', imageIds);

  if (error || !images) {
    console.error('❌ Error fetching images:', error?.message);
    return;
  }

  console.log(`\n📸 Processing ${images.length} images with ML optimization`);

  // Estimate costs
  const estimatedCost = costEstimator.estimateBatchCost(images.length);
  console.log(`\n💰 Estimated Cost: $${estimatedCost?.totalCost?.toFixed(2) || '0.00'}`);
  console.log(`   Input tokens: ~${estimatedCost?.inputTokens?.toLocaleString() || '0'}`);
  console.log(`   Output tokens: ~${estimatedCost?.outputTokens?.toLocaleString() || '0'}`);

  // Process with parallel batch processor
  const batchProcessor = new ParallelBatchProcessor({
    concurrency: 4,
    retryAttempts: 3,
    retryDelay: 1000
  });

  let totalAnnotations = 0;
  const results = await batchProcessor.processBatch(
    images.map((img: any) => ({
      id: img.id.toString(),
      data: img
    })),
    async (img: any) => {
      const startTime = Date.now();

      try {
        // Generate annotations with ML enhancement
        const annotations = await visionService.generateAnnotations(img.url, {
          speciesId: img.species.id,
          speciesName: img.species.english_name
        });

        // Validate and filter
        const validationResult = await validator.validateAndFilter(annotations);
        const validAnnotations = validationResult.valid;

        // Learn from annotations
        await patternLearner.learnFromAnnotations(validAnnotations, {
          imageId: img.id,
          speciesId: img.species.id,
          sessionId: `ml-pipeline-${Date.now()}`
        });

        // Store in database
        if (validAnnotations.length > 0) {
          const { error: annotError } = await supabase
            .from('annotations')
            .insert(
              validAnnotations.map((ann: any) => ({
                image_id: img.id,
                feature_name: ann.feature,
                x: ann.bbox.x,
                y: ann.bbox.y,
                width: ann.bbox.width,
                height: ann.bbox.height,
                confidence: ann.confidence,
                metadata: { ml_enhanced: true, quality_score: ann.qualityScore }
              }))
            );

          if (annotError) {
            console.error(`   ❌ Error storing annotations: ${annotError.message}`);
          }
        }

        totalAnnotations += validAnnotations.length;

        const duration = Date.now() - startTime;
        performanceTracker.recordTask(img.id.toString(), duration, 'completed');

        console.log(`   ✅ ${img.species.english_name}: ${validAnnotations.length} annotations (${duration}ms)`);

        return { success: true, count: validAnnotations.length };

      } catch (error: any) {
        const duration = Date.now() - startTime;
        performanceTracker.recordTask(img.id.toString(), duration, 'failed');
        console.error(`   ❌ Error processing ${img.id}: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  );

  const metrics = performanceTracker.getMetrics();
  console.log(`\n📊 Annotation Pipeline Complete:`);
  console.log(`   Total annotations: ${totalAnnotations}`);
  console.log(`   Success rate: ${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%`);
  console.log(`   P50 latency: ${metrics.p50.toFixed(0)}ms`);
  console.log(`   P95 latency: ${metrics.p95.toFixed(0)}ms`);
  console.log(`   Throughput: ${metrics.throughput.toFixed(2)} images/sec`);
}

/**
 * Step 6: Analyze vocabulary balance improvements
 */
async function analyzeImprovements(beforeGaps: VocabularyGap[]): Promise<void> {
  console.log('\n📈 ANALYZING VOCABULARY BALANCE IMPROVEMENTS');
  console.log('='.repeat(80));

  const afterGaps = await analyzeVocabularyGaps();

  console.log(`\n🎯 Improvement Analysis:`);

  const improvements = beforeGaps.map(before => {
    const after = afterGaps.find(g => g.feature === before.feature);
    if (!after) return null;

    const improvement = before.deficit - after.deficit;
    const improvementPct = (improvement / before.deficit) * 100;

    return {
      feature: before.feature,
      beforeDeficit: before.deficit,
      afterDeficit: after.deficit,
      improvement,
      improvementPct
    };
  }).filter(x => x !== null && x.improvement > 0)
    .sort((a, b) => b!.improvement - a!.improvement);

  console.log(`\n🚀 Top Improvements:`);
  improvements.slice(0, 10).forEach((imp: any) => {
    console.log(`   ${imp.feature.padEnd(20)} - Deficit reduced by ${imp.improvement} (${imp.improvementPct.toFixed(1)}%)`);
  });

  // Export report
  const report = {
    timestamp: new Date().toISOString(),
    beforeGaps: beforeGaps.slice(0, 20),
    afterGaps: afterGaps.slice(0, 20),
    improvements,
    summary: {
      totalImprovements: improvements.length,
      averageImprovement: improvements.reduce((sum: number, imp: any) => sum + imp.improvementPct, 0) / improvements.length,
      criticalGapsResolved: beforeGaps.filter(g => g.priority === 'critical').length - afterGaps.filter(g => g.priority === 'critical').length
    }
  };

  writeFileSync(
    'ml-improvement-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log(`\n✨ Report exported to: ml-improvement-report.json`);
  console.log(`\n📊 Summary:`);
  console.log(`   Features improved: ${report.summary.totalImprovements}`);
  console.log(`   Average improvement: ${report.summary.averageImprovement.toFixed(1)}%`);
  console.log(`   Critical gaps resolved: ${report.summary.criticalGapsResolved}`);
}

/**
 * Main orchestrator
 */
async function runMLOptimizedPipeline() {
  console.log('\n🚀 ML-OPTIMIZED ANNOTATION PIPELINE WITH VOCABULARY BALANCE');
  console.log('='.repeat(80));
  console.log('Goal: Improve tagging accuracy through balanced vocabulary training');
  console.log('='.repeat(80));

  try {
    // Step 1: Analyze current vocabulary gaps
    const vocabularyGaps = await analyzeVocabularyGaps();

    // Step 2: Generate ML-guided species priorities
    const speciesPriorities = await generateMLGuidedSpeciesPriorities(vocabularyGaps);

    // Step 3: Curate targeted images
    const curatedImages = await curateMLTargetedImages(speciesPriorities);

    if (curatedImages.length === 0) {
      console.log('\n⚠️  No images curated. Exiting.');
      return;
    }

    // Export curation results
    writeFileSync(
      'ml-curated-images.json',
      JSON.stringify(curatedImages, null, 2)
    );
    console.log(`\n📁 Curated images exported to: ml-curated-images.json`);

    // Step 4: Import to database
    const imageIds = await importImagesToDatabase(curatedImages);

    if (imageIds.length === 0) {
      console.log('\n⚠️  No images imported. Exiting.');
      return;
    }

    // Step 5: Run ML annotation pipeline
    await runMLAnnotationPipeline(imageIds);

    // Step 6: Analyze improvements
    await analyzeImprovements(vocabularyGaps);

    console.log('\n✅ ML-OPTIMIZED PIPELINE COMPLETE!');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Pipeline error:', error.message);
    console.error(error.stack);
  }
}

// Run the pipeline
runMLOptimizedPipeline().catch(console.error);
