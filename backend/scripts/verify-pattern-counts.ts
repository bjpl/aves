/**
 * Script to verify pattern observation counts against actual database
 *
 * This script helps identify discrepancies between:
 * 1. PatternLearner's observationCount (in-memory tracking)
 * 2. Actual approved annotation counts in database
 *
 * Issue: PatternLearner may count all annotations, not just approved ones
 */

import { pool } from '../src/database/connection';
import { PatternLearner } from '../src/services/PatternLearner';

interface AnnotationCount {
  species: string;
  spanish_term: string;
  english_term: string;
  total_count: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
}

async function verifyPatternCounts() {
  const client = await pool.connect();

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  PATTERN OBSERVATION COUNT VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Get actual counts from database by species and feature
    console.log('1. Querying database for annotation counts by species and feature...\n');

    const dbQuery = `
      SELECT
        s.english_name as species,
        ai.spanish_term,
        ai.english_term,
        COUNT(*) as total_count,
        SUM(CASE WHEN ai.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN ai.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN ai.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
      FROM ai_annotation_items ai
      JOIN images i ON i.id = ai.image_id
      JOIN species s ON s.id = i.species_id
      WHERE ai.status IN ('approved', 'pending', 'rejected')
      GROUP BY s.english_name, ai.spanish_term, ai.english_term
      ORDER BY s.english_name, approved_count DESC
    `;

    const result = await client.query<AnnotationCount>(dbQuery);

    // 2. Get PatternLearner analytics
    console.log('2. Getting PatternLearner analytics...\n');
    const patternLearner = new PatternLearner();
    await patternLearner.ensureInitialized();
    const analytics = patternLearner.getAnalytics();

    // 3. Compare counts
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  COMPARISON RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`PatternLearner reports ${analytics.totalPatterns} total patterns\n`);

    // Group by species
    const speciesMap = new Map<string, AnnotationCount[]>();
    for (const row of result.rows) {
      if (!speciesMap.has(row.species)) {
        speciesMap.set(row.species, []);
      }
      speciesMap.get(row.species)!.push(row);
    }

    // Display results by species
    let totalMismatches = 0;
    let totalFeaturesChecked = 0;

    for (const [species, features] of speciesMap.entries()) {
      console.log(`\n📊 Species: ${species}`);
      console.log('─'.repeat(80));

      const totalApproved = features.reduce((sum, f) => sum + f.approved_count, 0);
      const totalPending = features.reduce((sum, f) => sum + f.pending_count, 0);
      const totalRejected = features.reduce((sum, f) => sum + f.rejected_count, 0);

      console.log(`   Summary: ${totalApproved} approved, ${totalPending} pending, ${totalRejected} rejected\n`);

      for (const feature of features.slice(0, 10)) {
        totalFeaturesChecked++;

        // Try to find matching pattern in PatternLearner
        const matchingPattern = analytics.topFeatures.find(
          p => p.feature === feature.spanish_term
        );

        const patternCount = matchingPattern?.observations || 0;
        const isMismatch = patternCount !== feature.approved_count;

        if (isMismatch) {
          totalMismatches++;
        }

        const status = isMismatch ? '❌ MISMATCH' : '✅ MATCH';

        console.log(`   ${feature.spanish_term} (${feature.english_term})`);
        console.log(`      Database: ${feature.total_count} total (${feature.approved_count} approved, ${feature.pending_count} pending, ${feature.rejected_count} rejected)`);
        console.log(`      PatternLearner: ${patternCount} observations`);
        console.log(`      Status: ${status}`);

        if (isMismatch && patternCount > 0) {
          console.log(`      ⚠️  Difference: PatternLearner shows ${patternCount} but only ${feature.approved_count} are approved`);
        }
        console.log();
      }

      if (features.length > 10) {
        console.log(`   ... and ${features.length - 10} more features for this species\n`);
      }
    }

    // 4. Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Total species checked: ${speciesMap.size}`);
    console.log(`Total features checked: ${totalFeaturesChecked}`);
    console.log(`Mismatches found: ${totalMismatches}`);
    console.log(`Accuracy rate: ${((1 - totalMismatches / totalFeaturesChecked) * 100).toFixed(1)}%\n`);

    if (totalMismatches > 0) {
      console.log('⚠️  ISSUE IDENTIFIED:');
      console.log('   PatternLearner observation counts do not match approved annotation counts.');
      console.log('   This suggests PatternLearner is counting ALL annotations (pending/approved/rejected)');
      console.log('   instead of only APPROVED annotations.\n');
      console.log('💡 SOLUTION:');
      console.log('   1. Update PatternLearner.getAnalytics() to query actual approved counts from database');
      console.log('   2. Modify mlAnalytics routes to use database queries instead of in-memory counts');
      console.log('   3. Add status filter to only learn from approved annotations\n');
    } else {
      console.log('✅ No issues found! Counts are accurate.\n');
    }

    // 5. Check specific species mentioned in the issue
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SPECIFIC CASE: PLUMAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const plumasFeatures = result.rows.filter(r =>
      r.species.toLowerCase().includes('plumas')
    );

    if (plumasFeatures.length > 0) {
      console.log(`Found ${plumasFeatures.length} features for species containing "plumas":\n`);

      for (const feature of plumasFeatures) {
        console.log(`   ${feature.spanish_term} (${feature.english_term})`);
        console.log(`      Total: ${feature.total_count}, Approved: ${feature.approved_count}, Pending: ${feature.pending_count}, Rejected: ${feature.rejected_count}\n`);
      }

      const totalApprovedPlumas = plumasFeatures.reduce((sum, f) => sum + f.approved_count, 0);
      const totalAllPlumas = plumasFeatures.reduce((sum, f) => sum + f.total_count, 0);

      console.log(`   TOTALS for Plumas:`);
      console.log(`      All annotations: ${totalAllPlumas}`);
      console.log(`      Approved only: ${totalApprovedPlumas}`);

      if (totalAllPlumas === 45) {
        console.log(`\n   ✅ CONFIRMED: The "45 observations" likely counts ALL annotations`);
        console.log(`      The correct number (approved only) should be: ${totalApprovedPlumas}`);
      }
    } else {
      console.log('   No annotations found for species containing "plumas"');
      console.log('   Searching for similar species names...\n');

      const allSpecies = Array.from(new Set(result.rows.map(r => r.species)));
      console.log('   Available species:');
      for (const sp of allSpecies.slice(0, 20)) {
        console.log(`      - ${sp}`);
      }
      if (allSpecies.length > 20) {
        console.log(`      ... and ${allSpecies.length - 20} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verifyPatternCounts()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
