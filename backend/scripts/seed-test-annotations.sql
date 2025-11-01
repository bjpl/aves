-- Seed test AI annotations with valid placeholder images
-- These use placeholder.com service which is reliable and always available

-- Clear existing test data
DELETE FROM ai_annotations WHERE job_id LIKE 'test_%';

-- Insert test annotations with different statuses
INSERT INTO ai_annotations (job_id, image_id, annotation_data, status, confidence_score, created_at, updated_at) VALUES
-- Pending annotations
('test_001', '550e8400-e29b-41d4-a716-446655440001',
 '[{"spanishTerm":"Barras Alares Blancas","englishTerm":"White Wing Bars","boundingBox":{"x":0.3,"y":0.4,"width":0.2,"height":0.15},"type":"anatomical","difficultyLevel":2,"confidence":0.87,"pronunciation":"[barras alares blancas]"}]',
 'pending', 0.87, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

('test_002', '550e8400-e29b-41d4-a716-446655440002',
 '[{"spanishTerm":"Cresta Azul","englishTerm":"Blue Crest","boundingBox":{"x":0.45,"y":0.2,"width":0.15,"height":0.1},"type":"anatomical","difficultyLevel":2,"confidence":0.93,"pronunciation":"[cresta azul]"}]',
 'pending', 0.93, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- Approved annotations
('test_003', '550e8400-e29b-41d4-a716-446655440003',
 '[{"spanishTerm":"Pico Naranja","englishTerm":"Orange Beak","boundingBox":{"x":0.35,"y":0.35,"width":0.08,"height":0.05},"type":"anatomical","difficultyLevel":1,"confidence":0.95,"pronunciation":"[pico naranja]"}]',
 'approved', 0.95, NOW() - INTERVAL '3 days', NOW()),

-- More test data for demonstration
('test_004', '550e8400-e29b-41d4-a716-446655440004',
 '[{"spanishTerm":"Cola Ahorquillada","englishTerm":"Forked Tail","boundingBox":{"x":0.6,"y":0.5,"width":0.2,"height":0.25},"type":"anatomical","difficultyLevel":3,"confidence":0.89,"pronunciation":"[cola ahorquillada]"}]',
 'pending', 0.89, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

('test_005', '550e8400-e29b-41d4-a716-446655440005',
 '[{"spanishTerm":"Máscara Negra","englishTerm":"Black Mask","boundingBox":{"x":0.3,"y":0.25,"width":0.15,"height":0.1},"type":"pattern","difficultyLevel":2,"confidence":0.91,"pronunciation":"[máscara negra]"}]',
 'approved', 0.91, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days');

-- Create corresponding image records if they don't exist
INSERT INTO images (id, url, photographer, source, license, species_id, created_at)
VALUES
('550e8400-e29b-41d4-a716-446655440001', 'https://via.placeholder.com/800x600/4287f5/ffffff?text=Blue+Jay', 'Test Data', 'placeholder', 'CC0', 1, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'https://via.placeholder.com/800x600/f54242/ffffff?text=Cardinal', 'Test Data', 'placeholder', 'CC0', 2, NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'https://via.placeholder.com/800x600/42f554/ffffff?text=Parakeet', 'Test Data', 'placeholder', 'CC0', 3, NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'https://via.placeholder.com/800x600/f5d442/ffffff?text=Canary', 'Test Data', 'placeholder', 'CC0', 4, NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'https://via.placeholder.com/800x600/8542f5/ffffff?text=Finch', 'Test Data', 'placeholder', 'CC0', 5, NOW())
ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url;