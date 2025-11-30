import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') });

async function runDescriptions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📝 Adding bilingual descriptions to species...\n');

    const sql = readFileSync(join(__dirname, 'add-bilingual-descriptions.sql'), 'utf-8');
    const result = await pool.query(sql);

    console.log('✅ Descriptions added successfully!\n');
    console.log('Results:');
    if (result[result.length - 1]?.rows) {
      result[result.length - 1].rows.forEach((row: any) => {
        console.log(`  ${row.description_status} ${row.spanish_name} (${row.scientific_name})`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDescriptions();
