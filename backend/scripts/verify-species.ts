import { pool } from '../src/database/connection';

async function verify() {
  try {
    // Check for any remaining duplicates
    const duplicates = await pool.query(`
      SELECT LOWER(english_name) as name, COUNT(*) as count
      FROM species
      GROUP BY LOWER(english_name)
      HAVING COUNT(*) > 1
    `);
    console.log('Duplicate species:', duplicates.rows.length === 0 ? 'None ✓' : duplicates.rows);

    // Count total species
    const speciesCount = await pool.query('SELECT COUNT(*) as total FROM species');
    console.log('Total species:', speciesCount.rows[0].total);

    // Count images per species
    const imageStats = await pool.query(`
      SELECT s.english_name, COUNT(i.id) as image_count
      FROM species s
      LEFT JOIN images i ON s.id = i.species_id
      GROUP BY s.id, s.english_name
      ORDER BY image_count DESC
      LIMIT 10
    `);
    console.log('\nTop 10 species by image count:');
    imageStats.rows.forEach((r: any) => console.log(`  ${r.english_name}: ${r.image_count} images`));

    // Check annotations
    const annotationStats = await pool.query(`
      SELECT COUNT(*) as total FROM ai_annotation_items WHERE status = 'approved'
    `);
    console.log('\nApproved annotations:', annotationStats.rows[0].total);

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    await pool.end();
    process.exit(1);
  }
}

verify();
