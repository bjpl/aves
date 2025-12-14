/**
 * Script to run duplicate species migration
 * Run with: npx ts-node scripts/run-duplicate-species-migration.ts
 */

import { pool } from '../src/database/connection';

async function runMigration() {
  console.log('========================================');
  console.log('Starting duplicate species migration');
  console.log('========================================');

  try {
    // Step 1: Find duplicates by english_name (case-insensitive)
    const duplicatesQuery = await pool.query(`
      SELECT
        LOWER(english_name) as name_lower,
        COUNT(*) as count,
        array_agg(id ORDER BY
          (SELECT COUNT(*) FROM images WHERE species_id = species.id) DESC,
          created_at ASC
        ) as species_ids,
        array_agg(english_name ORDER BY id) as names
      FROM species
      GROUP BY LOWER(english_name)
      HAVING COUNT(*) > 1
    `);

    if (duplicatesQuery.rows.length === 0) {
      console.log('✓ No duplicate species found - database is clean!');
      await pool.end();
      return;
    }

    console.log(`Found ${duplicatesQuery.rows.length} duplicate species groups`);

    interface MergeResult {
      englishName: string;
      keptId: string;
      removedId: string;
      imagesReassigned: number;
    }

    const results: MergeResult[] = [];
    let totalImagesReassigned = 0;
    let totalDuplicatesRemoved = 0;

    for (const duplicate of duplicatesQuery.rows) {
      const speciesIds = duplicate.species_ids;
      const keptId = speciesIds[0]; // Keep the one with most images

      console.log(`\nProcessing: ${duplicate.names[0]}`);
      console.log(`  Keeping ID: ${keptId}`);

      // Process each duplicate (skip the first one, which we're keeping)
      for (let i = 1; i < speciesIds.length; i++) {
        const duplicateId = speciesIds[i];

        // Get the duplicate info
        const dupInfo = await pool.query(
          `SELECT id, english_name,
            (SELECT COUNT(*) FROM images WHERE species_id = species.id) as image_count
           FROM species WHERE id = $1`,
          [duplicateId]
        );

        if (dupInfo.rows.length === 0) continue;

        const dupRecord = dupInfo.rows[0];
        console.log(`  Merging ID: ${duplicateId} (${dupRecord.image_count} images)`);

        // Reassign images from duplicate to kept species
        const reassignResult = await pool.query(
          `UPDATE images
           SET species_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE species_id = $2
           RETURNING id`,
          [keptId, duplicateId]
        );

        const imagesReassigned = reassignResult.rowCount || 0;
        totalImagesReassigned += imagesReassigned;

        // Delete the duplicate species
        await pool.query('DELETE FROM species WHERE id = $1', [duplicateId]);
        totalDuplicatesRemoved++;

        results.push({
          englishName: dupRecord.english_name,
          keptId,
          removedId: duplicateId,
          imagesReassigned
        });

        console.log(`  ✓ Merged: ${imagesReassigned} images reassigned`);
      }
    }

    // Verify no duplicates remain
    const verifyQuery = await pool.query(`
      SELECT COUNT(*) as count FROM (
        SELECT LOWER(english_name) as name_lower
        FROM species
        GROUP BY LOWER(english_name)
        HAVING COUNT(*) > 1
      ) duplicates
    `);

    const remainingDuplicates = parseInt(verifyQuery.rows[0].count);

    console.log('\n========================================');
    console.log('Migration complete!');
    console.log(`  Duplicates removed: ${totalDuplicatesRemoved}`);
    console.log(`  Images reassigned: ${totalImagesReassigned}`);
    console.log(`  Remaining duplicates: ${remainingDuplicates}`);
    console.log('========================================');

    if (remainingDuplicates > 0) {
      console.log('⚠️  WARNING: Some duplicates still remain!');
    } else {
      console.log('✓ Verification passed: No duplicate species entries');
    }

    await pool.end();

  } catch (err) {
    console.error('Error running migration:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
