-- Migration 020: Seed Production Bird Data
-- CONCEPT: Pre-populate database with bird species and high-quality Unsplash images
-- WHY: Application requires image data to function - prevents "Image unavailable" errors
-- NOTE: Uses public Unsplash URLs that work without API keys

-- ============================================================================
-- SPECIES DATA (10 common North American birds)
-- ============================================================================

INSERT INTO species (
  scientific_name, english_name, spanish_name,
  order_name, family_name, genus, size_category,
  primary_colors, habitats, conservation_status,
  description_spanish, description_english, fun_fact
) VALUES
-- 1. Northern Cardinal
(
  'Cardinalis cardinalis',
  'Northern Cardinal',
  'Cardenal Rojo',
  'Passeriformes',
  'Cardinalidae',
  'Cardinalis',
  'small',
  ARRAY['red', 'black'],
  ARRAY['forest', 'urban', 'garden'],
  'LC',
  'El cardenal norteño es conocido por su brillante plumaje rojo y su distintiva cresta.',
  'The Northern Cardinal is known for its brilliant red plumage and distinctive crest.',
  'Cardinals do not migrate and can brighten even the coldest winter day.'
),
-- 2. Blue Jay
(
  'Cyanocitta cristata',
  'Blue Jay',
  'Arrendajo Azul',
  'Passeriformes',
  'Corvidae',
  'Cyanocitta',
  'medium',
  ARRAY['blue', 'white', 'black'],
  ARRAY['forest', 'urban', 'garden'],
  'LC',
  'El arrendajo azul es un ave inteligente conocida por su llamativo plumaje azul.',
  'The Blue Jay is an intelligent bird known for its striking blue plumage.',
  'Blue Jays can mimic the calls of hawks to scare other birds away from food.'
),
-- 3. American Robin
(
  'Turdus migratorius',
  'American Robin',
  'Petirrojo Americano',
  'Passeriformes',
  'Turdidae',
  'Turdus',
  'medium',
  ARRAY['red', 'brown', 'gray'],
  ARRAY['forest', 'urban', 'garden', 'grassland'],
  'LC',
  'El petirrojo americano es famoso por su pecho anaranjado rojizo.',
  'The American Robin is famous for its reddish-orange breast.',
  'Robins can produce three broods in one year and are often the first sign of spring.'
),
-- 4. Mourning Dove
(
  'Zenaida macroura',
  'Mourning Dove',
  'Paloma Huilota',
  'Columbiformes',
  'Columbidae',
  'Zenaida',
  'medium',
  ARRAY['brown', 'gray', 'pink'],
  ARRAY['urban', 'grassland', 'desert'],
  'LC',
  'La paloma huilota es conocida por su canto melancólico.',
  'The Mourning Dove is known for its melancholic cooing song.',
  'Mourning Doves can drink water by suction, unlike most birds that tilt their heads back.'
),
-- 5. House Sparrow
(
  'Passer domesticus',
  'House Sparrow',
  'Gorrión Común',
  'Passeriformes',
  'Passeridae',
  'Passer',
  'small',
  ARRAY['brown', 'gray', 'black'],
  ARRAY['urban', 'garden'],
  'LC',
  'El gorrión común es una de las aves más adaptables del mundo.',
  'The House Sparrow is one of the most adaptable birds in the world.',
  'House Sparrows were introduced to North America in 1851 in Brooklyn, New York.'
),
-- 6. American Goldfinch
(
  'Spinus tristis',
  'American Goldfinch',
  'Jilguero Americano',
  'Passeriformes',
  'Fringillidae',
  'Spinus',
  'small',
  ARRAY['yellow', 'black', 'white'],
  ARRAY['meadow', 'garden', 'forest edge'],
  'LC',
  'El jilguero americano tiene un brillante plumaje amarillo en verano.',
  'The American Goldfinch has bright yellow plumage in summer.',
  'Goldfinches are strict vegetarians and even feed their young seeds rather than insects.'
),
-- 7. Red-winged Blackbird
(
  'Agelaius phoeniceus',
  'Red-winged Blackbird',
  'Tordo Sargento',
  'Passeriformes',
  'Icteridae',
  'Agelaius',
  'medium',
  ARRAY['black', 'red', 'yellow'],
  ARRAY['wetland', 'marsh', 'meadow'],
  'LC',
  'El tordo sargento macho muestra distintivas manchas rojas en las alas.',
  'The male Red-winged Blackbird displays distinctive red shoulder patches.',
  'Males fiercely defend their territories and may have up to 15 females nesting there.'
),
-- 8. Great Blue Heron
(
  'Ardea herodias',
  'Great Blue Heron',
  'Garza Azulada',
  'Pelecaniformes',
  'Ardeidae',
  'Ardea',
  'large',
  ARRAY['blue', 'gray', 'white'],
  ARRAY['wetland', 'coastal', 'lake'],
  'LC',
  'La garza azulada es el ave zancuda más grande de América del Norte.',
  'The Great Blue Heron is the largest wading bird in North America.',
  'Herons can strike at prey at lightning speed, catching fish in their dagger-like bills.'
),
-- 9. Ruby-throated Hummingbird
(
  'Archilochus colubris',
  'Ruby-throated Hummingbird',
  'Colibrí Garganta de Rubí',
  'Apodiformes',
  'Trochilidae',
  'Archilochus',
  'small',
  ARRAY['green', 'red', 'white'],
  ARRAY['forest', 'garden', 'meadow'],
  'LC',
  'El colibrí garganta de rubí es el único colibrí que anida al este del Mississippi.',
  'The Ruby-throated Hummingbird is the only hummingbird that nests east of the Mississippi.',
  'Their wings beat about 53 times per second and they can fly backwards.'
),
-- 10. Bald Eagle
(
  'Haliaeetus leucocephalus',
  'Bald Eagle',
  'Águila Calva',
  'Accipitriformes',
  'Accipitridae',
  'Haliaeetus',
  'large',
  ARRAY['brown', 'white', 'yellow'],
  ARRAY['coastal', 'lake', 'river', 'forest'],
  'LC',
  'El águila calva es el símbolo nacional de los Estados Unidos.',
  'The Bald Eagle is the national symbol of the United States.',
  'Bald Eagles can see fish from a mile away and dive at speeds up to 100 mph.'
)
ON CONFLICT (scientific_name) DO UPDATE SET
  spanish_name = EXCLUDED.spanish_name,
  description_spanish = EXCLUDED.description_spanish,
  description_english = EXCLUDED.description_english,
  fun_fact = EXCLUDED.fun_fact;

-- ============================================================================
-- IMAGE DATA (Using real Unsplash URLs - public access, no API key needed)
-- These are direct links to high-quality bird photographs
-- ============================================================================

-- Get species IDs for image insertion
DO $$
DECLARE
  cardinal_id UUID;
  bluejay_id UUID;
  robin_id UUID;
  dove_id UUID;
  sparrow_id UUID;
  goldfinch_id UUID;
  blackbird_id UUID;
  heron_id UUID;
  hummingbird_id UUID;
  eagle_id UUID;
BEGIN
  -- Fetch species IDs
  SELECT id INTO cardinal_id FROM species WHERE scientific_name = 'Cardinalis cardinalis';
  SELECT id INTO bluejay_id FROM species WHERE scientific_name = 'Cyanocitta cristata';
  SELECT id INTO robin_id FROM species WHERE scientific_name = 'Turdus migratorius';
  SELECT id INTO dove_id FROM species WHERE scientific_name = 'Zenaida macroura';
  SELECT id INTO sparrow_id FROM species WHERE scientific_name = 'Passer domesticus';
  SELECT id INTO goldfinch_id FROM species WHERE scientific_name = 'Spinus tristis';
  SELECT id INTO blackbird_id FROM species WHERE scientific_name = 'Agelaius phoeniceus';
  SELECT id INTO heron_id FROM species WHERE scientific_name = 'Ardea herodias';
  SELECT id INTO hummingbird_id FROM species WHERE scientific_name = 'Archilochus colubris';
  SELECT id INTO eagle_id FROM species WHERE scientific_name = 'Haliaeetus leucocephalus';

  -- Insert images for Northern Cardinal
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (cardinal_id, 'cardinal-001', 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=800', 800, 600, '#c41e3a', 'Northern Cardinal perched on branch', 'Unsplash', 'unsplash', 'unsplash'),
    (cardinal_id, 'cardinal-002', 'https://images.unsplash.com/photo-1551031895-7f8e06d714f8?w=800', 800, 600, '#c41e3a', 'Male Northern Cardinal in winter', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for Blue Jay
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (bluejay_id, 'bluejay-001', 'https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=800', 800, 600, '#4169e1', 'Blue Jay with crest raised', 'Unsplash', 'unsplash', 'unsplash'),
    (bluejay_id, 'bluejay-002', 'https://images.unsplash.com/photo-1590005354167-6da97870c757?w=800', 800, 600, '#4169e1', 'Blue Jay on feeder', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for American Robin
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (robin_id, 'robin-001', 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800', 800, 600, '#cc5500', 'American Robin on lawn', 'Unsplash', 'unsplash', 'unsplash'),
    (robin_id, 'robin-002', 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=800', 800, 600, '#cc5500', 'Robin with worm', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for Mourning Dove
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (dove_id, 'dove-001', 'https://images.unsplash.com/photo-1596071915134-94f36f1d3188?w=800', 800, 600, '#8b7355', 'Mourning Dove perched', 'Unsplash', 'unsplash', 'unsplash'),
    (dove_id, 'dove-002', 'https://images.unsplash.com/photo-1612024782955-49fae79e42bb?w=800', 800, 600, '#8b7355', 'Pair of Mourning Doves', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for House Sparrow
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (sparrow_id, 'sparrow-001', 'https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800', 800, 600, '#8b4513', 'House Sparrow close-up', 'Unsplash', 'unsplash', 'unsplash'),
    (sparrow_id, 'sparrow-002', 'https://images.unsplash.com/photo-1591198936750-16d8e15edb9e?w=800', 800, 600, '#8b4513', 'House Sparrow feeding', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for American Goldfinch
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (goldfinch_id, 'goldfinch-001', 'https://images.unsplash.com/photo-1580774998750-bfb65320b286?w=800', 800, 600, '#ffd700', 'American Goldfinch on thistle', 'Unsplash', 'unsplash', 'unsplash'),
    (goldfinch_id, 'goldfinch-002', 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800', 800, 600, '#ffd700', 'Goldfinch in summer plumage', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for Red-winged Blackbird
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (blackbird_id, 'blackbird-001', 'https://images.unsplash.com/photo-1588690203882-81b0d1a39b51?w=800', 800, 600, '#000000', 'Red-winged Blackbird displaying', 'Unsplash', 'unsplash', 'unsplash'),
    (blackbird_id, 'blackbird-002', 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=800', 800, 600, '#000000', 'Blackbird on cattail', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for Great Blue Heron
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (heron_id, 'heron-001', 'https://images.unsplash.com/photo-1604608672516-f1b9a53a4ed6?w=800', 800, 600, '#4682b4', 'Great Blue Heron wading', 'Unsplash', 'unsplash', 'unsplash'),
    (heron_id, 'heron-002', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', 800, 600, '#4682b4', 'Heron in flight', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for Ruby-throated Hummingbird
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (hummingbird_id, 'hummingbird-001', 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=800', 800, 600, '#228b22', 'Ruby-throated Hummingbird at flower', 'Unsplash', 'unsplash', 'unsplash'),
    (hummingbird_id, 'hummingbird-002', 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800', 800, 600, '#228b22', 'Hummingbird hovering', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

  -- Insert images for Bald Eagle
  INSERT INTO images (species_id, unsplash_id, url, width, height, color, description, photographer, photographer_username, source_type)
  VALUES
    (eagle_id, 'eagle-001', 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800', 800, 600, '#8b4513', 'Bald Eagle portrait', 'Unsplash', 'unsplash', 'unsplash'),
    (eagle_id, 'eagle-002', 'https://images.unsplash.com/photo-1557401751-376608588678?w=800', 800, 600, '#8b4513', 'Eagle soaring', 'Unsplash', 'unsplash', 'unsplash')
  ON CONFLICT (unsplash_id) DO UPDATE SET url = EXCLUDED.url;

END $$;

-- ============================================================================
-- UPDATE annotation_count for images (for primaryImageUrl ordering)
-- ============================================================================

UPDATE images SET annotation_count = 1 WHERE annotation_count IS NULL OR annotation_count = 0;

-- ============================================================================
-- VERIFY SEED DATA
-- ============================================================================

DO $$
DECLARE
  species_count INTEGER;
  image_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO species_count FROM species;
  SELECT COUNT(*) INTO image_count FROM images;

  RAISE NOTICE 'Seed data verification:';
  RAISE NOTICE '  - Species: % rows', species_count;
  RAISE NOTICE '  - Images: % rows', image_count;

  IF species_count < 10 THEN
    RAISE WARNING 'Expected at least 10 species, got %', species_count;
  END IF;

  IF image_count < 20 THEN
    RAISE WARNING 'Expected at least 20 images, got %', image_count;
  END IF;
END $$;
