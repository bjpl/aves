import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  try {
    // First, clear existing test data
    const { error: deleteError } = await supabase
      .from('ai_annotations')
      .delete()
      .like('job_id', 'test_%');

    if (deleteError) {
      console.error('Error deleting test data:', deleteError);
    }

    // Insert test AI annotations
    const testAnnotations = [
      {
        job_id: 'test_001',
        image_id: '550e8400-e29b-41d4-a716-446655440001',
        annotation_data: JSON.stringify([{
          spanishTerm: 'Barras Alares Blancas',
          englishTerm: 'White Wing Bars',
          boundingBox: { x: 0.3, y: 0.4, width: 0.2, height: 0.15 },
          type: 'anatomical',
          difficultyLevel: 2,
          confidence: 0.87,
          pronunciation: '[barras alares blancas]'
        }]),
        status: 'pending',
        confidence_score: 0.87
      },
      {
        job_id: 'test_002',
        image_id: '550e8400-e29b-41d4-a716-446655440002',
        annotation_data: JSON.stringify([{
          spanishTerm: 'Cresta Azul',
          englishTerm: 'Blue Crest',
          boundingBox: { x: 0.45, y: 0.2, width: 0.15, height: 0.1 },
          type: 'anatomical',
          difficultyLevel: 2,
          confidence: 0.93,
          pronunciation: '[cresta azul]'
        }]),
        status: 'pending',
        confidence_score: 0.93
      },
      {
        job_id: 'test_003',
        image_id: '550e8400-e29b-41d4-a716-446655440003',
        annotation_data: JSON.stringify([{
          spanishTerm: 'Pico Naranja',
          englishTerm: 'Orange Beak',
          boundingBox: { x: 0.35, y: 0.35, width: 0.08, height: 0.05 },
          type: 'anatomical',
          difficultyLevel: 1,
          confidence: 0.95,
          pronunciation: '[pico naranja]'
        }]),
        status: 'approved',
        confidence_score: 0.95
      }
    ];

    const { data: annotationsData, error: annotationsError } = await supabase
      .from('ai_annotations')
      .insert(testAnnotations);

    if (annotationsError) {
      console.error('Error inserting AI annotations:', annotationsError);
    } else {
      console.log('✅ Inserted test AI annotations');
    }

    // Insert test images with working placeholder URLs
    // Schema: id, species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username
    const testImages = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        species_id: 1,
        url: 'https://via.placeholder.com/800x600/4287f5/ffffff?text=Blue+Jay',
        width: 800,
        height: 600,
        color: '#4287f5',
        description: 'Blue Jay test image',
        photographer: 'Test Data',
        photographer_username: 'testdata'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        species_id: 2,
        url: 'https://via.placeholder.com/800x600/f54242/ffffff?text=Cardinal',
        width: 800,
        height: 600,
        color: '#f54242',
        description: 'Cardinal test image',
        photographer: 'Test Data',
        photographer_username: 'testdata'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        species_id: 3,
        url: 'https://via.placeholder.com/800x600/42f554/ffffff?text=Parakeet',
        width: 800,
        height: 600,
        color: '#42f554',
        description: 'Parakeet test image',
        photographer: 'Test Data',
        photographer_username: 'testdata'
      }
    ];

    const { data: imagesData, error: imagesError } = await supabase
      .from('images')
      .upsert(testImages, { onConflict: 'id' });

    if (imagesError) {
      console.error('Error inserting images:', imagesError);
    } else {
      console.log('✅ Inserted test images');
    }

    // Also insert into ai_annotation_items for the pending review page
    // Schema requires job_id (not nullable)
    const testItems = [
      {
        job_id: 'test_001',
        image_id: '550e8400-e29b-41d4-a716-446655440001',
        spanish_term: 'Barras Alares Blancas',
        english_term: 'White Wing Bars',
        bounding_box: { x: 0.3, y: 0.4, width: 0.2, height: 0.15 },
        annotation_type: 'anatomical',
        difficulty_level: 2,
        confidence: 0.87,
        pronunciation: '[barras alares blancas]',
        status: 'pending'
      },
      {
        job_id: 'test_002',
        image_id: '550e8400-e29b-41d4-a716-446655440002',
        spanish_term: 'Cresta Azul',
        english_term: 'Blue Crest',
        bounding_box: { x: 0.45, y: 0.2, width: 0.15, height: 0.1 },
        annotation_type: 'anatomical',
        difficulty_level: 2,
        confidence: 0.93,
        pronunciation: '[cresta azul]',
        status: 'pending'
      }
    ];

    const { data: itemsData, error: itemsError } = await supabase
      .from('ai_annotation_items')
      .insert(testItems);

    if (itemsError) {
      console.error('Error inserting AI annotation items:', itemsError);
    } else {
      console.log('✅ Inserted test AI annotation items');
    }

    console.log('🎉 Test data seeding complete!');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

seedTestData();