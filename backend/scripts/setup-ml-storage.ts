/**
 * Setup ML Patterns Storage Bucket
 * Creates the ml-patterns bucket in Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupMLStorage() {
  console.log('🔧 Setting up ML Patterns Storage...\n');

  try {
    // Create the ml-patterns bucket
    const { data: bucket, error: createError } = await supabase.storage.createBucket('ml-patterns', {
      public: false, // Private bucket - only accessible with service role key
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: ['application/json']
    });

    if (createError) {
      // Check if bucket already exists
      if (createError.message.includes('already exists')) {
        console.log('✅ Bucket "ml-patterns" already exists');
      } else {
        console.error('❌ Error creating bucket:', createError);
        process.exit(1);
      }
    } else {
      console.log('✅ Created bucket "ml-patterns"');
    }

    // List buckets to confirm
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
    } else {
      console.log('\n📦 Available buckets:');
      buckets?.forEach(b => {
        console.log(`   - ${b.name} (${b.public ? 'public' : 'private'})`);
      });
    }

    console.log('\n✅ ML Storage setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npx tsx scripts/analyze-existing-annotations.ts');
    console.log('   2. Patterns will be saved to Supabase Storage');
    console.log('   3. Deploy to Railway for production use\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupMLStorage();
