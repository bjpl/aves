import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check images table schema
    const { data: imagesSchema, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .limit(1);

    if (imagesError) {
      console.error('❌ Error querying images table:', imagesError);
    } else {
      console.log('✅ Images table exists');
      if (imagesSchema && imagesSchema.length > 0) {
        console.log('📋 Sample row columns:', Object.keys(imagesSchema[0]));
      }
    }

    // Check ai_annotations table schema
    const { data: aiAnnotationsSchema, error: aiAnnotationsError } = await supabase
      .from('ai_annotations')
      .select('*')
      .limit(1);

    if (aiAnnotationsError) {
      console.error('❌ Error querying ai_annotations table:', aiAnnotationsError);
    } else {
      console.log('✅ AI annotations table exists');
      if (aiAnnotationsSchema && aiAnnotationsSchema.length > 0) {
        console.log('📋 Sample row columns:', Object.keys(aiAnnotationsSchema[0]));
      }
    }

    // Check ai_annotation_items table schema
    const { data: aiItemsSchema, error: aiItemsError } = await supabase
      .from('ai_annotation_items')
      .select('*')
      .limit(1);

    if (aiItemsError) {
      console.error('❌ Error querying ai_annotation_items table:', aiItemsError);
    } else {
      console.log('✅ AI annotation items table exists');
      if (aiItemsSchema && aiItemsSchema.length > 0) {
        console.log('📋 Sample row columns:', Object.keys(aiItemsSchema[0]));
      }
    }

  } catch (err) {
    console.error('Fatal error:', err);
  }
}

checkSchema();